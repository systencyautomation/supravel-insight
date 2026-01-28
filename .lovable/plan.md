
# Correção: Cálculo de ICMS e Persistência das Deduções

## Problemas Identificados

### 1. ICMS Calculado Errado (R$ 2.033,28 em vez de R$ 20,33)

**Causa:** O campo `percentual_icms` está salvo como `4.00` (inteiro), mas o código multiplica diretamente:
- **Errado:** `508.32 × 4.00 = 2.033,28`
- **Correto:** `508.32 × 0.04 = 20,33`

### 2. Deduções Não Persistidas

As colunas `icms`, `pis_cofins` e `ir_csll` na tabela `sales` estão `null`. Esses valores precisam ser salvos durante a aprovação para que apareçam corretamente na visualização posterior.

---

## Arquivos a Modificar

### 1. `src/hooks/useSalesWithCalculations.ts`

**Problema:** Linha 118 usa `sale.percentual_icms` diretamente como multiplicador.

**Solução:** Converter para taxa decimal se o valor for > 1:

```typescript
// Se percentual_icms é 4, 7, ou 12 (inteiro), converter para 0.04, 0.07, 0.12
const savedIcmsRate = Number(sale.percentual_icms) || 0;
const icmsRateCalc = savedIcmsRate > 1 ? savedIcmsRate / 100 : savedIcmsRate;
deducaoIcms = overPriceBruto * icmsRateCalc;
```

### 2. `src/pages/SalesApproval.tsx`

**Problema:** As deduções não estão sendo salvas no `updateData`.

**Solução:** Adicionar os campos de dedução no objeto de atualização:

```typescript
// No handleApproveWithAssignment e handleEditModeSave:
const updateData = {
  // ... campos existentes ...
  
  // Adicionar deduções para persistir
  icms: calcularDeducaoIcms(confirmedCalculation.overPrice, confirmedCalculation.icmsDestino),
  pis_cofins: confirmedCalculation.overPrice * 0.0925,
  ir_csll: confirmedCalculation.overPrice * 0.34,
};
```

### 3. `src/components/approval/CommissionCalculator.tsx`

Adicionar os valores de dedução ao `CalculationData` para que sejam passados corretamente:

```typescript
export interface CalculationData {
  // ... campos existentes ...
  
  // Deduções para persistência
  deducaoIcms: number;
  deducaoPisCofins: number;
  deducaoIrCsll: number;
}
```

---

## Fluxo Corrigido

```text
APROVAÇÃO (Etapa 1 ou 2):
┌─────────────────────────────────────────────────┐
│ Cálculos calculados (activeCalculation):        │
│ - deducaoIcms: R$ 20,33                         │
│ - deducaoPisCofins: R$ 47,02                    │
│ - deducaoIrCsll: R$ 148,69                      │
└─────────────────────────────────────────────────┘
            ↓ Salvar no banco
┌─────────────────────────────────────────────────┐
│ UPDATE sales SET                                │
│   icms = 20.33,                                 │
│   pis_cofins = 47.02,                           │
│   ir_csll = 148.69,                             │
│   ...                                           │
└─────────────────────────────────────────────────┘
            ↓ Visualização posterior
┌─────────────────────────────────────────────────┐
│ SaleDetailSheet lê diretamente do banco:        │
│ - ICMS (4%): -R$ 20,33                          │
│ - PIS/COFINS: -R$ 47,02                         │
│ - IR/CSLL: -R$ 148,69                           │
└─────────────────────────────────────────────────┘
```

---

## Resumo das Mudanças

| Arquivo | Mudança |
|---------|---------|
| `useSalesWithCalculations.ts` | Converter `percentual_icms` para decimal (÷ 100 se > 1) |
| `SalesApproval.tsx` | Adicionar `icms`, `pis_cofins`, `ir_csll` no updateData |
| `CommissionCalculator.tsx` | Expor deduções no `CalculationData` para persistência |

---

## Sobre "Tem que salvar no banco?"

**Sim!** Para que os valores de dedução apareçam corretamente em visualizações futuras, eles precisam ser persistidos no banco durante a aprovação. Atualmente apenas `over_price` e `over_price_liquido` estão sendo salvos, mas `icms`, `pis_cofins` e `ir_csll` ficam `null`.
