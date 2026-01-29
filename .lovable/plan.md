
# Plano: Desconsiderar Over Price Negativo no Cálculo de Comissão

## Problema Atual

Quando o Over Price é negativo (valor de venda menor que valor tabela ajustado), o sistema está:
1. Exibindo o over negativo: -R$ 8.785,51
2. Subtraindo esse valor da comissão do pedido
3. Resultado: R$ 10.392,00 - R$ 8.785,51 = R$ 1.606,49

**Regra de Negócio Correta:** Over negativo deve ser **desconsiderado** (= R$ 0,00), mantendo a comissão apenas como o valor base do pedido (R$ 10.392,00).

---

## Arquivos a Modificar

### 1. `src/lib/approvalCalculator.ts`

**Linhas 156-159 - Tratar over negativo como zero:**

```typescript
// ANTES:
} else {
  // Se over negativo, passa direto (sem deduções)
  overLiquido = overPrice;
  console.log('[approvalCalculator] Over negativo, sem deduções:', overLiquido);
}

// DEPOIS:
} else {
  // Se over negativo, desconsiderar (tratar como 0)
  overLiquido = 0;
  console.log('[approvalCalculator] Over negativo, desconsiderando:', overPrice, '→ 0');
}
```

### 2. `src/components/approval/CommissionCalculator.tsx`

**Linhas 737-741 - Ajustar exibição para mostrar "desconsiderado":**

Quando o over bruto for negativo, exibir uma nota visual indicando que foi desconsiderado:

```tsx
<div className="flex justify-between">
  <span>Over Price Líquido</span>
  {activeCalculation.overPrice < 0 ? (
    <span className="text-muted-foreground text-xs italic">
      (desconsiderado)
    </span>
  ) : (
    <span>{formatCurrency(activeCalculation.overLiquido)}</span>
  )}
</div>
```

---

## Comportamento Esperado

| Cenário | Antes | Depois |
|---------|-------|--------|
| Over Price | -R$ 8.785,51 | -R$ 8.785,51 (exibido) |
| Over Price Líquido na soma | -R$ 8.785,51 | R$ 0,00 (desconsiderado) |
| Comissão Base | R$ 10.392,00 | R$ 10.392,00 |
| **Total** | R$ 1.606,49 | **R$ 10.392,00** |

---

## Fluxo Visual

```
Valor Real (VP): R$ 121.114,49
Valor Tabela Ajustado: R$ 129.900,00
                ↓
Over Price = R$ 121.114,49 - R$ 129.900,00 = -R$ 8.785,51
                ↓
Over Price < 0? SIM
                ↓
Over Líquido = R$ 0,00 (desconsiderado)
                ↓
Comissão Total = R$ 10.392,00 + R$ 0,00 = R$ 10.392,00 ✓
```

---

## Resumo das Alterações

| Arquivo | Linha | Mudança |
|---------|-------|---------|
| `approvalCalculator.ts` | 156-159 | Setar `overLiquido = 0` quando over negativo |
| `CommissionCalculator.tsx` | 737-741 | Exibir "(desconsiderado)" quando over bruto < 0 |
