
# Plano: Correção do Percentual de Comissão na Aba Recebimentos

## Problema Identificado

Na aba **Recebimentos**, a coluna "% Com" está mostrando valores errados (média de 0.6%) quando deveria mostrar o percentual real da comissão (12.45% no exemplo).

### Causa Raiz

O hook `useRecebimentosData` está calculando o percentual assim:

```typescript
// Linha 43-45 - ERRADO
const percentualComissao = comissaoSalva > 0 && totalValue > 0
  ? (comissaoSalva / totalValue) * 100
  : sale.percentualComissaoCalculado || 0;
```

**O problema:**
- `commission_calculated` = comissão **do vendedor/representante** (ex: R$ 50)
- `total_value` = valor total da NF (ex: R$ 9.490)
- Resultado: R$ 50 / R$ 9.490 = **0.53%** ← Valor errado!

**O correto:**
- O percentual deveria ser o `percentualComissaoCalculado` que representa a comissão **da empresa** (12.45%)
- Esse valor já vem calculado corretamente no `useSalesWithCalculations`

---

## Solução

### Arquivo: `src/hooks/useRecebimentosData.ts`

**Mudança nas linhas 37-45:**

Substituir a lógica atual por uso direto do `percentualComissaoCalculado`:

```typescript
// ANTES (errado):
const comissaoSalva = Number(sale.commission_calculated) || 0;
const totalValue = Number(sale.total_value) || 0;

const percentualComissao = comissaoSalva > 0 && totalValue > 0
  ? (comissaoSalva / totalValue) * 100
  : sale.percentualComissaoCalculado || 0;

// DEPOIS (correto):
// Usar percentual da comissão da empresa (já calculado corretamente)
const percentualComissao = sale.percentualComissaoCalculado || 0;
```

---

## Comportamento Esperado

| Campo | Antes | Depois |
|-------|-------|--------|
| Entrada R$ 3.796 | 0.53% | **12.45%** |
| Parcela 1 R$ 1.898 | 0.53% | **12.45%** |
| Parcela 2 R$ 1.898 | 0.53% | **12.45%** |
| Parcela 3 R$ 1.898 | 0.53% | **12.45%** |

### Exemplo de Cálculo Correto

| Valor | Percentual | Comissão |
|-------|------------|----------|
| Entrada R$ 3.796,00 | 12.45% | R$ 472,60 |
| Parcela 1 R$ 1.898,00 | 12.45% | R$ 236,30 |
| Parcela 2 R$ 1.898,00 | 12.45% | R$ 236,30 |
| Parcela 3 R$ 1.898,00 | 12.45% | R$ 236,30 |
| **Total** | | **R$ 1.181,50** |

---

## Resumo das Alterações

| Arquivo | Linha | Mudança |
|---------|-------|---------|
| `useRecebimentosData.ts` | 37-45 | Usar `percentualComissaoCalculado` diretamente em vez de calcular via `commission_calculated / total_value` |

---

## Fluxo de Dados Correto

```
useSalesWithCalculations
         ↓
percentualComissaoCalculado = 12.45%
(calculado: comissãoEmpresa / valorTotal × 100)
         ↓
useRecebimentosData
         ↓
Cada recebimento usa percentualComissao = 12.45%
         ↓
Valor Comissão = valor × 12.45%
         ↓
Entrada R$3.796 × 12.45% = R$472,60
Parcela R$1.898 × 12.45% = R$236,30
```
