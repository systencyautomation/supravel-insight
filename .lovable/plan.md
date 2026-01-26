

## Plano: Adicionar Informações de Parcelas e % Comissão no Detalhes da Venda

### Objetivo

Atualizar o componente `SaleDetailSheet` para mostrar:
1. **Seção de Parcelamento** com detalhes das parcelas (quantidade, valor, datas)
2. **Percentual da Comissão Total** na seção de comissão (ex: 11,00%)

---

### Problema Atual

O `SaleDetailSheet` recebe `SaleWithDetails` que não tem os campos calculados:
- `installments` (parcelas)
- `percentualComissaoCalculado` (11,00%)
- `valorComissaoCalculado` (R$ 2.540,87)

Mas na `SalesListTable`, o componente recebe `selectedSale` que é do tipo `SaleWithCalculations` (já tem todos os dados necessários).

---

### Solução

1. Atualizar a interface do `SaleDetailSheet` para aceitar `SaleWithCalculations`
2. Adicionar seção de **Parcelamento** após o Resumo Financeiro
3. Atualizar seção de **Comissão** para mostrar o percentual total (11,00%)

---

### Nova Seção de Parcelamento

Adicionar entre o "Resumo Financeiro" e o "Cálculo do Over Price":

```text
┌─────────────────────────────────────┐
│ 💳 Parcelamento                      │
├─────────────────────────────────────┤
│ Entrada           R$ 8.996,00       │
│ Parcelas          3x R$ 4.697,35    │
│ Total Parcelado   R$ 14.092,05      │
│                                     │
│ Parcela 1  16/02/2026  R$ 4.697,35  │
│ Parcela 2  16/03/2026  R$ 4.697,35  │
│ Parcela 3  16/04/2026  R$ 4.697,35  │
└─────────────────────────────────────┘
```

---

### Atualização da Seção de Comissão

De:
```text
Comissão Base (8%)          R$ 1.679,33
Over Price Líquido          R$ 861,53
────────────────────────────────────────
Comissão Total              R$ 2.540,87
```

Para:
```text
Comissão Base (8%)          R$ 1.679,33
Over Price Líquido          R$ 861,53
────────────────────────────────────────
Comissão Total  11,00%      R$ 2.540,87
```

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/dashboard/SaleDetailSheet.tsx` | Atualizar interface e adicionar seção de parcelamento |
| `src/components/vendas/SalesListTable.tsx` | Nenhuma (já passa `SaleWithCalculations`) |

---

### Mudanças Detalhadas

#### 1. Atualizar Interface do Componente

De:
```typescript
import { SaleWithDetails } from '@/hooks/useSalesMetrics';

interface SaleDetailSheetProps {
  sale: SaleWithDetails | null;
  installments?: Installment[];
  // ...
}
```

Para:
```typescript
import { SaleWithCalculations } from '@/hooks/useSalesWithCalculations';

interface SaleDetailSheetProps {
  sale: SaleWithCalculations | null;
  // installments já está dentro de SaleWithCalculations
  // ...
}
```

#### 2. Adicionar Nova Seção de Parcelamento

```tsx
{/* Payment/Installments Section */}
{sale.qtdParcelas > 0 && (
  <div className="space-y-3">
    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
      <CreditCard className="h-4 w-4" />
      Parcelamento
    </div>
    
    <div className="bg-muted/30 rounded-lg p-4 space-y-3">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Entrada</span>
        <span className="font-mono">{formatCurrency(sale.entradaCalculada)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Parcelas</span>
        <span className="font-mono">
          {sale.qtdParcelas}x {formatCurrency(sale.somaParcelas / sale.qtdParcelas)}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Total Parcelado</span>
        <span className="font-mono">{formatCurrency(sale.somaParcelas)}</span>
      </div>
      
      <Separator className="my-2" />
      
      <p className="text-xs text-muted-foreground uppercase tracking-wide">Detalhes das Parcelas</p>
      <div className="space-y-1 text-sm">
        {sale.installments.map((inst, idx) => (
          <div key={inst.id} className="flex justify-between text-muted-foreground">
            <span>Parcela {idx + 1}</span>
            <div className="flex gap-4">
              {inst.due_date && (
                <span className="text-xs">
                  {format(parseISO(inst.due_date), 'dd/MM/yyyy')}
                </span>
              )}
              <span className="font-mono">{formatCurrency(Number(inst.value))}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)}
```

#### 3. Atualizar Seção de Comissão com Percentual

De:
```tsx
<div className="flex justify-between text-lg font-bold">
  <span>Comissão Total</span>
  <span className="text-primary">{formatCurrency(comissaoTotal)}</span>
</div>
```

Para:
```tsx
<div className="flex justify-between text-lg font-bold">
  <div className="flex items-center gap-2">
    <span>Comissão Total</span>
    <Badge variant="outline" className="text-xs font-normal">
      {sale.percentualComissaoCalculado.toFixed(2)}%
    </Badge>
  </div>
  <span className="text-primary">{formatCurrency(sale.valorComissaoCalculado)}</span>
</div>
```

---

### Resultado Visual Esperado

```text
┌──────────────────────────────────────────┐
│ 📋 Detalhes da Venda           [Aprovado]│
│ NF-e 770 • 16 de Janeiro de 2026         │
├──────────────────────────────────────────┤
│ 🏢 Cliente                               │
│ CLEBER JOAO VICENZI                      │
│ CNPJ: 07.147.100/0001-14                 │
│ UF Destino: SC                           │
├──────────────────────────────────────────┤
│ 📄 Produto                               │
│ CDD12J                                   │
│ Código: CDD12J - N                       │
├──────────────────────────────────────────┤
│ 💰 Resumo Financeiro                     │
│ Valor Nominal (NF)        R$ 23.088,05   │
│ Valor Tabela              R$ 20.991,67   │
├──────────────────────────────────────────┤
│ 💳 Parcelamento                          │
│ Entrada                   R$ 8.996,00    │
│ Parcelas                  3x R$ 4.697,35 │
│ Total Parcelado           R$ 14.092,05   │
│ ──────────────────────────────────────   │
│ DETALHES DAS PARCELAS                    │
│ Parcela 1   16/02/2026    R$ 4.697,35    │
│ Parcela 2   16/03/2026    R$ 4.697,35    │
│ Parcela 3   16/04/2026    R$ 4.697,35    │
├──────────────────────────────────────────┤
│ 📉 Cálculo do Over Price                 │
│ Over Price Bruto          R$ 2.096,38    │
│ ──────────────────────────────────────   │
│ DEDUÇÕES                                 │
│ ICMS (12%)                -R$ 251,57     │
│ PIS/COFINS (9,25%)        -R$ 193,92     │
│ IR/CSLL (34%)             -R$ 789,37     │
│ ──────────────────────────────────────   │
│ Over Price Líquido        R$ 861,53      │
├──────────────────────────────────────────┤
│ 📊 Comissão                              │
│ Comissão Base (8%)        R$ 1.679,33    │
│ Over Price Líquido        R$ 861,53      │
│ ──────────────────────────────────────   │
│ Comissão Total [11,00%]   R$ 2.540,87    │
└──────────────────────────────────────────┘
```

---

### Seção Técnica

**Mudança de tipagem:**
```typescript
// Antes
interface SaleDetailSheetProps {
  sale: SaleWithDetails | null;
  installments?: Installment[];
}

// Depois
interface SaleDetailSheetProps {
  sale: SaleWithCalculations | null;
}
```

**Novos imports necessários:**
```typescript
import { CreditCard } from 'lucide-react';
import { SaleWithCalculations } from '@/hooks/useSalesWithCalculations';
```

**Remover import não utilizado:**
```typescript
// Remover
import { Installment } from '@/hooks/useOrganizationData';
```

**Ajuste para pagamento à vista:**
Se `qtdParcelas === 0`, não mostrar a seção de parcelamento (mantém comportamento atual).

