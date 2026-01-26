

## Plano: Atualizar Tabela de Vendas da Empresa

### Objetivo

Ajustar a exibição das colunas na tabela de vendas para mostrar:
1. **% Comissão**: 11,0051% (total R$ 2.540,87 / Valor Faturado R$ 23.088,05)
2. **Comissão**: R$ 2.540,87 (soma de Pedido R$ 1.679,33 + Over R$ 861,53)
3. **Entrada/Parcelas**: Combinar entrada + parcelas em uma coluna

---

### Mudanças na Coluna de Entrada

Atualmente a coluna "Entrada" mostra apenas o valor (R$ 8.996,00). O novo formato mostrará ambas as informações:

| Antes | Depois |
|-------|--------|
| R$ 8.996,00 | R$ 8.996,00<br/>3x R$ 4.697,35 |

**Se não houver parcelas** (pagamento à vista):
| Formato |
|---------|
| À Vista |

---

### Verificação dos Cálculos

Os cálculos do arquivo `useSalesWithCalculations.ts` já estão corretos:

```text
valorComissaoCalculado = comissaoTotal = comissaoPedido + overLiquido
                       = R$ 1.679,33 + R$ 861,53
                       = R$ 2.540,87 ✓

percentualComissaoCalculado = percentualFinal
                            = (comissaoTotal / valorFaturado) × 100
                            = (2.540,87 / 23.088,05) × 100
                            = 11,0051% ✓
```

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/vendas/SalesListTable.tsx` | Atualizar célula da coluna "Entrada" para mostrar parcelas |

---

### Mudanças no Código

#### Atualizar a célula da coluna Entrada

De (linha ~456-472):
```tsx
<TableCell className="text-right">
  <div className="flex items-center justify-end gap-1">
    <span className="font-mono">{formatCurrency(sale.entradaCalculada)}</span>
    {sale.entradaVerificada && (
      <Tooltip>
        <TooltipTrigger>
          <BadgeCheck className="h-4 w-4 text-success" />
        </TooltipTrigger>
        <TooltipContent>
          <p>Verificado via boletos</p>
          <p className="text-xs text-muted-foreground">
            {sale.qtdParcelas} parcelas de{' '}
            {formatCurrency(sale.somaParcelas / sale.qtdParcelas)}
          </p>
        </TooltipContent>
      </Tooltip>
    )}
  </div>
</TableCell>
```

Para:
```tsx
<TableCell className="text-right">
  <div className="flex flex-col items-end">
    {sale.qtdParcelas > 0 ? (
      <>
        <span className="font-mono text-sm">
          {formatCurrency(sale.entradaCalculada)}
        </span>
        <span className="text-xs text-muted-foreground font-mono">
          {sale.qtdParcelas}x {formatCurrency(sale.somaParcelas / sale.qtdParcelas)}
        </span>
      </>
    ) : (
      <span className="font-mono text-sm">À Vista</span>
    )}
  </div>
</TableCell>
```

---

### Renomear Título da Coluna

Mudar de "Entrada" para "Pagamento" para refletir melhor o conteúdo:

```tsx
<ColumnFilterHeader
  title="Pagamento"  // Era "Entrada"
  columnKey="entradaCalculada"
  ...
/>
```

---

### Resultado Esperado

#### Visualização na Tabela

| Data | NF | Cliente | Produto | Valor Total | Pagamento | % Comissão | Comissão | Status |
|------|-----|---------|---------|-------------|-----------|------------|----------|--------|
| 16/01/2026 | 9063 | CLEBER... | CDD12J | R$ 23.088,05 | R$ 8.996,00<br/>3x R$ 4.697,35 | 11,01% | R$ 2.540,87 | Pago |

---

### Nota sobre Comissões do Vendedor

O usuário mencionou que o R$ 2.540,87 é "sujo" porque:
- Sobre R$ 1.679,33 (pedido): vendedor recebe **5%** = R$ 83,97
- Sobre R$ 861,53 (over): vendedor recebe **10%** = R$ 86,15
- **Total vendedor**: R$ 170,12

Este cálculo de comissão do vendedor será implementado na aba de comissões do vendedor, não na tabela da empresa.

---

### Seção Técnica

**Interface SaleWithCalculations usada:**
```typescript
interface SaleWithCalculations {
  // ... campos existentes
  entradaCalculada: number;      // Valor da entrada
  somaParcelas: number;          // Soma total das parcelas
  qtdParcelas: number;           // Quantidade de parcelas
  valorComissaoCalculado: number; // R$ 2.540,87
  percentualComissaoCalculado: number; // 11,0051%
}
```

**Lógica de exibição:**
```text
SE qtdParcelas > 0:
   Mostrar: "R$ {entrada}"
            "{qtd}x R$ {valor_parcela}"
SENÃO:
   Mostrar: "À Vista"
```

