
# Plano: Correção do Input Manual de Entrada e Detecção de Parcelas

## Problema Identificado

### 1. Lógica de Detecção Incorreta
O código atual assume que a **primeira parcela (installment_number === 1)** é sempre a "entrada":

```typescript
const entrada = installments.find(i => i.installment_number === 1);
const parcelas = installments.filter(i => i.installment_number > 1);
```

**Problema:** Para a NF-e 7810, existem 2 parcelas:
- Parcela 1: R$ 3.800,00 (vencimento 07/02/2026)
- Parcela 2: R$ 3.800,00 (vencimento 09/03/2026)

O sistema está tratando a parcela 1 como "entrada" e a parcela 2 como a única parcela restante.

**Correto:** Quando as duas parcelas têm o mesmo valor e somam o total, a entrada é **R$ 0** e existem **2 parcelas**.

### 2. useEffect Sobrescreve Input Manual
O useEffect na linha 286-291 sobrescreve o valor da entrada quando `tipoPagamento === 'a_vista'`:

```typescript
useEffect(() => {
  if (tipoPagamento === 'a_vista' && !parcelasEditadasManualmente && valorFaturado > 0) {
    setValorEntrada(valorFaturado);
  }
}, [tipoPagamento, valorFaturado, parcelasEditadasManualmente]);
```

**Problema:** Quando o usuário seleciona "Parcelado Boleto" e digita entrada = 0, se a detecção automática retornar ao estado anterior, o valor é sobrescrito.

### 3. Datas de Vencimento
As datas **07/02/2026** e **09/03/2026** já estão corretas no banco de dados. Não há problema com as datas.

---

## Solução Proposta

### Arquivo: `src/components/approval/CommissionCalculator.tsx`

#### Mudança 1: Melhorar detecção de parcelamento (linhas 233-252)

**Lógica atual incorreta:**
```typescript
const entrada = installments.find(i => i.installment_number === 1);
const parcelas = installments.filter(i => i.installment_number > 1);

if (parcelas.length > 0) {
  setValorEntrada(entrada?.value || 0);
  setQtdParcelas(parcelas.length);
}
```

**Nova lógica:**
```typescript
// Verificar se parcelas são uniformes (mesmo valor = sem entrada separada)
const valores = installments.map(i => i.value);
const todosIguais = valores.length > 1 && valores.every(v => Math.abs(v - valores[0]) < 0.01);
const somaTotal = valores.reduce((acc, v) => acc + v, 0);

if (todosIguais && Math.abs(somaTotal - valorFaturado) < 0.01) {
  // Parcelas uniformes que somam o total = entrada é 0
  setTipoPagamento('parcelado_boleto');
  setValorEntrada(0);
  setQtdParcelas(installments.length);
  setValorParcelaReal(installments[0]?.value || 0);
} else if (installments.length > 1) {
  // Primeira parcela diferente = provavelmente é entrada
  const entrada = installments[0];
  const parcelas = installments.slice(1);
  setTipoPagamento('parcelado_boleto');
  setValorEntrada(entrada?.value || 0);
  setQtdParcelas(parcelas.length);
  setValorParcelaReal(parcelas[0]?.value || 0);
} else if (installments.length === 1) {
  // Apenas 1 installment = à vista
  setTipoPagamento('a_vista');
  setQtdParcelas(0);
  setValorParcelaReal(0);
}
```

#### Mudança 2: Não sobrescrever input manual após edição (linha 229)

Adicionar verificação para não sobrescrever entrada quando já foi editada manualmente:

```typescript
// Antes
setValorEntrada(sale.valor_entrada || 0);

// Depois
if (!parcelasEditadasManualmente) {
  setValorEntrada(sale.valor_entrada || 0);
}
```

#### Mudança 3: Garantir que edição manual persista (linhas 286-291)

Ajustar o useEffect para não interferir após edição manual:

```typescript
// O useEffect já verifica !parcelasEditadasManualmente
// Mas precisamos garantir que quando o usuário muda para parcelado_boleto,
// o flag seja mantido e o valor da entrada não seja resetado
```

---

## Comportamento Esperado Após Correção

| Cenário NF-e 7810 | Antes | Depois |
|-------------------|-------|--------|
| Tipo Pagamento | parcelado_boleto | parcelado_boleto |
| Entrada | R$ 3.800,00 | R$ 0,00 |
| Qtd Parcelas | 1 | 2 |
| Valor Parcela | R$ 3.800,00 | R$ 3.800,00 |

| Ação do Usuário | Antes | Depois |
|-----------------|-------|--------|
| Editar Entrada para 0 | Valor é sobrescrito | Valor persiste |
| Mudar para "Parcelado Boleto" | Entrada resetada | Entrada mantida |

---

## Resumo das Alterações

| Arquivo | Linha | Mudança |
|---------|-------|---------|
| `CommissionCalculator.tsx` | 233-252 | Nova lógica de detecção: parcelas uniformes = entrada 0 |
| `CommissionCalculator.tsx` | 229 | Não sobrescrever entrada se já editada manualmente |
| `CommissionCalculator.tsx` | 233-252 | Usar valorFaturado para comparar soma das parcelas |

---

## Fluxo Visual Corrigido

```
NF-e 7810 carregada
         ↓
installments = [3800, 3800]
         ↓
Todos iguais? SIM ✓
Soma = Total? 7600 = 7600 ✓
         ↓
tipoPagamento = 'parcelado_boleto'
valorEntrada = 0
qtdParcelas = 2
valorParcela = 3800
         ↓
Usuário edita entrada → parcelasEditadasManualmente = true
         ↓
useEffects respeitam o flag e não sobrescrevem
```
