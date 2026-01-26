

## Plano: Corrigir Exibição de Entrada/Parcelas e % Comissão na Tabela

### Problema Identificado

A tabela de vendas mostra valores incorretos:

| Campo | Valor Atual (Errado) | Valor Esperado |
|-------|---------------------|----------------|
| Entrada | -R$ 0,00 | R$ 8.996,00 |
| Parcelas | 4x R$ 5.772,01 | 3x R$ 4.697,35 |
| % Comissão | 9,28% | 11,00% |
| Comissão | R$ 2.143,34 | R$ 2.540,87 |

**Causa raiz:** A entrada (R$ 8.996,00) está sendo salva na tabela `installments` como `installment_number = 1`, fazendo o sistema calcular:
- `somaParcelas` = 8.996 + 4.697,35×3 = R$ 23.088,05 (inclui entrada)
- `entradaCalculada` = 23.088,05 - 23.088,05 = R$ 0,00
- `qtdParcelas` = 4 (ao invés de 3)

Mas o banco de dados **já tem os valores corretos salvos**:
- `valor_entrada`: R$ 8.996,00
- `commission_calculated`: R$ 2.540,87

---

### Solução Proposta

Modificar o hook `useSalesWithCalculations.ts` para:
1. **Usar `sale.valor_entrada`** do banco quando disponível
2. **Excluir a primeira parcela** do cálculo de parcelas (ela é a entrada)
3. **Usar `sale.commission_calculated`** e recalcular o percentual a partir dele

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useSalesWithCalculations.ts` | Priorizar valores salvos e filtrar entrada das parcelas |
| `src/components/vendas/SalesListTable.tsx` | Formatar % com 2 casas decimais |

---

### Mudanças Detalhadas

#### 1. Corrigir `useSalesWithCalculations.ts`

Separar entrada das parcelas e usar dados salvos:

De:
```typescript
const saleInstallments = installments.filter(i => i.sale_id === sale.id);
const somaParcelas = saleInstallments.reduce((acc, i) => acc + Number(i.value || 0), 0);
const qtdParcelas = saleInstallments.length;
const entradaCalculada = totalValue - somaParcelas;
```

Para:
```typescript
// Buscar todas as parcelas da venda
const saleInstallments = installments.filter(i => i.sale_id === sale.id);

// A entrada já existe no campo valor_entrada da venda
// Verificar se a primeira parcela é a entrada (valor igual a valor_entrada)
const valorEntradaSalvo = Number(sale.valor_entrada) || 0;

// Filtrar apenas as parcelas (excluindo a entrada se estiver nas installments)
const parcelasReais = saleInstallments.filter((i, idx) => {
  // Se o valor da parcela é igual ao valor_entrada, provavelmente é a entrada
  if (idx === 0 && valorEntradaSalvo > 0 && Math.abs(Number(i.value) - valorEntradaSalvo) < 0.01) {
    return false; // Excluir - é a entrada
  }
  return true;
});

const somaParcelas = parcelasReais.reduce((acc, i) => acc + Number(i.value || 0), 0);
const qtdParcelas = parcelasReais.length;

// Usar valor_entrada salvo OU calcular
const entradaCalculada = valorEntradaSalvo > 0 
  ? valorEntradaSalvo 
  : totalValue - somaParcelas;
```

#### 2. Usar comissão salva quando disponível

Se a venda já foi aprovada, usar `commission_calculated`:

```typescript
// Verificar se tem comissão já calculada/aprovada
const comissaoSalva = Number(sale.commission_calculated) || 0;

if (comissaoSalva > 0) {
  // Venda já processada - usar valores salvos
  const percentualFinal = totalValue > 0 ? (comissaoSalva / totalValue) * 100 : 0;
  
  return {
    ...saleWithDetails,
    // ... outros campos
    valorComissaoCalculado: comissaoSalva,
    percentualComissaoCalculado: percentualFinal,
    // ...
  };
}
```

#### 3. Formatar % Comissão com 2 casas decimais

No `SalesListTable.tsx`, já está usando `toFixed(2)`:

```tsx
<TableCell className="text-right font-mono">
  {sale.percentualComissaoCalculado.toFixed(2)}%
</TableCell>
```

---

### Fluxo Corrigido

```text
Venda NF 770:
1. Installments no banco: [8996, 4697.35, 4697.35, 4697.35]
2. Primeira parcela = valor_entrada? 8996 === 8996 ✓
3. Filtrar: parcelas reais = [4697.35, 4697.35, 4697.35]
4. somaParcelas = 14.092,05
5. qtdParcelas = 3
6. entradaCalculada = 8996 (do banco)
7. commission_calculated = 2540.87 (do banco)
8. percentual = 2540.87 / 23088.05 × 100 = 11.00%
```

**Resultado na tabela:**
| Pagamento | % Comissão | Comissão |
|-----------|------------|----------|
| R$ 8.996,00<br/>3x R$ 4.697,35 | 11,00% | R$ 2.540,87 |

---

### Seção Técnica

**Lógica de detecção da entrada:**
```typescript
// Detectar se installment[0] é entrada comparando com valor_entrada
const isEntrada = (installment: Installment, valorEntrada: number): boolean => {
  return valorEntrada > 0 && Math.abs(Number(installment.value) - valorEntrada) < 0.01;
};
```

**Prioridade de cálculo:**
1. Se `sale.commission_calculated > 0`: usar valor salvo
2. Senão: recalcular com `calculateApprovalCommission`

**Prioridade para entrada:**
1. Se `sale.valor_entrada > 0`: usar valor salvo
2. Senão: calcular `totalValue - somaParcelas`

