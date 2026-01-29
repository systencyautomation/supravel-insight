
# Plano: Correção da Seleção "À Vista" na Calculadora

## Problema Identificado

Quando não há parcelas (installments), o sistema deveria:
1. Detectar automaticamente que é pagamento "À Vista"
2. Preencher a Entrada com o Valor Faturado completo
3. Manter o radio button "À Vista" selecionado

**Situação atual:** O código define `setTipoPagamento('a_vista')` corretamente, mas seta `setValorEntrada(0)` em vez de `valorFaturado`.

---

## Lógica Corrigida

Arquivo: `src/components/approval/CommissionCalculator.tsx`

### Cenário: Sem installments = À Vista

Quando `installments.length === 0`:
- `tipoPagamento = 'a_vista'`
- `valorEntrada = valorFaturado` (não 0)
- `qtdParcelas = 0`

### Cenário: Apenas 1 installment = À Vista

Quando há apenas 1 installment (que seria a própria "entrada" ou pagamento único):
- `tipoPagamento = 'a_vista'`
- `valorEntrada = valorFaturado`
- `qtdParcelas = 0`

---

## Mudança Técnica

### useEffect de Installments (linhas 233-272)

**Antes:**
```typescript
} else {
  // Sem parcelas além da entrada = à vista
  setTipoPagamento('a_vista');
  setValorEntrada(0);  // ❌ ERRADO
  setQtdParcelas(0);
  setValorParcelaReal(0);
}
```

**Depois:**
```typescript
} else {
  // Sem parcelas além da entrada = à vista
  setTipoPagamento('a_vista');
  // À vista: entrada = valor total faturado
  // (será atualizado pelo valorFaturado via outro useEffect)
  setQtdParcelas(0);
  setValorParcelaReal(0);
}
```

### Novo useEffect para sincronizar entrada no modo À Vista

```typescript
// Sincronizar entrada com valorFaturado quando à vista
useEffect(() => {
  if (tipoPagamento === 'a_vista' && !parcelasEditadasManualmente) {
    setValorEntrada(valorFaturado);
  }
}, [tipoPagamento, valorFaturado, parcelasEditadasManualmente]);
```

---

## Comportamento Esperado

| Cenário | installments | tipoPagamento | valorEntrada |
|---------|-------------|---------------|--------------|
| Sem parcelas | 0 | a_vista | = valorFaturado |
| Apenas entrada | 1 (entrada) | a_vista | = valorFaturado |
| Entrada + Parcelas | 3+ | parcelado_boleto | = 1ª parcela |

---

## Fluxo Visual

```
NF-e importada → Sem boletos detectados
                         ↓
              installments.length === 0
                         ↓
              tipoPagamento = 'a_vista' ✓
                         ↓
              valorEntrada = valorFaturado ✓
                         ↓
              Radio "À Vista" selecionado ✓
              Campo Entrada preenchido ✓
```

---

## Resumo

| Arquivo | Mudança |
|---------|---------|
| `CommissionCalculator.tsx` | Remover `setValorEntrada(0)` quando à vista; adicionar useEffect para sincronizar entrada com valorFaturado no modo à vista |
