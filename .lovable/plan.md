
# Considerar Over Price Negativo na Comissao

## Mudanca de regra

Quando o valor faturado e menor que o valor de tabela, o over price negativo passa a reduzir a comissao da empresa. Exemplo do usuario:

```text
Tabela:   R$ 20.991,67
Faturado: R$ 20.600,00
Over:     -R$ 391,67
Comissao: R$ 1.287,66 (6,25%)
```

A comissao da empresa sera: base sobre tabela + over liquido (que sera negativo), resultando num valor menor. (caso seja over positivo mantem a logica de comissao sobre o valor da table + comissao do over)

## Arquivos a alterar

### 1. `src/lib/approvalCalculator.ts` (linhas 143-160)

Remover a condicao que zera o over negativo. Quando o over e negativo, nao ha deducoes fiscais (ICMS, PIS/COFINS, IR/CSLL ficam zeradas) -- os impostos so incidem sobre margem positiva. O over liquido assume o valor bruto negativo diretamente.

Logica nova:
- Over > 0: aplica deducoes em cascata (como hoje)
- Over < 0: deducoes = 0, overLiquido = overPrice (negativo, penaliza a comissao)

### 2. `src/hooks/useSalesWithCalculations.ts` (linha 104)

Ajustar a verificacao `hasOverPriceSaved` que hoje so detecta valores positivos (`> 0`). Mudar para considerar qualquer valor diferente de null/undefined, pois over negativo tambem e valido e deve ser preservado do banco.

### 3. `src/components/approval/CommissionCalculator.tsx` (linhas 765-771)

Remover o texto "(desconsiderado)" e exibir o valor negativo normalmente em vermelho, para que o usuario veja claramente o impacto na comissao.

## Secao Tecnica

**approvalCalculator.ts** - Bloco `if (overPrice > 0)` nas linhas 143-160:
```typescript
// ANTES: over negativo era zerado
// DEPOIS:
if (overPrice > 0) {
  // deducoes em cascata (sem mudanca)
} else {
  // Over negativo: sem deducoes fiscais, over liquido = over bruto
  deducaoIcms = 0;
  deducaoPisCofins = 0;
  deducaoIrCsll = 0;
  overLiquido = overPrice; // valor negativo reduz a comissao
}
```

**useSalesWithCalculations.ts** - Linha 104:
```typescript
// ANTES: const hasOverPriceSaved = Number(sale.over_price) > 0 || Number(sale.over_price_liquido) > 0;
// DEPOIS:
const hasOverPriceSaved = sale.over_price !== null && sale.over_price !== undefined;
```

**CommissionCalculator.tsx** - Linhas 765-771:
```typescript
// Remover condicional de "desconsiderado", exibir valor real (positivo ou negativo)
<span className={activeCalculation.overPrice < 0 ? "text-red-500" : ""}>
  {formatCurrency(activeCalculation.overLiquido)}
</span>
```
