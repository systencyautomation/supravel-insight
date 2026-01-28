
# Correção: Confusão entre Comissão Empresa vs Vendedor

## Problema Identificado

No modo de edição (quando clica no botão de lápis), o sistema está confundindo dois valores distintos:

| Campo | O que deveria ser | O que está sendo usado |
|-------|------------------|------------------------|
| `comissaoTotal` (Comissão Empresa) | R$ 1.679,33 (8% do valor tabela) | R$ 127,81 (total do vendedor) |
| Base de cálculo quando `comissao_base = comissao_empresa` | R$ 1.679,33 | R$ 127,81 |

### Raiz do Problema

**Linha 77 de `SalesApproval.tsx`:**
```typescript
comissaoTotal: editableSale.commission_calculated || 0,
```

O campo `commission_calculated` armazena o **total que o vendedor/representante recebe**, não a comissão bruta da empresa.

---

## Solução

### 1. Corrigir `src/pages/SalesApproval.tsx` (linhas 66-88)

Quando em modo de edição com step=2, calcular `comissaoTotal` corretamente:

```typescript
// De:
comissaoTotal: editableSale.commission_calculated || 0,

// Para:
comissaoTotal: (editableSale.table_value || 0) * ((editableSale.percentual_comissao || 0) / 100),
```

Isso garante que `comissaoTotal` seja sempre a comissão da **empresa** (valor tabela × percentual da empresa).

### 2. Corrigir `src/components/approval/SellerAssignment.tsx` (linhas 140-148)

Garantir que a `comissaoEmpresa` seja sempre calculada corretamente, não dependendo apenas de `confirmedData.comissaoTotal`:

```typescript
// De:
const comissaoEmpresa = confirmedData.comissaoTotal;

// Para:
const percentualEmpresa = confirmedData.percentualComissao || 0;
const comissaoEmpresa = valorTabela * (percentualEmpresa / 100);
```

Isso garante que mesmo que `confirmedData.comissaoTotal` venha com valor errado (legado), o cálculo seja feito corretamente.

---

## Resultado Esperado

```text
ANTES (ERRADO):
┌─────────────────────────────────────────────┐
│ Comissão Base (8%):    R$ 127,81  ← ERRADO! │
│ Over Price Líquido:    R$ 292,28            │
│ Comissão Total [0.58%] R$ 127,81            │
└─────────────────────────────────────────────┘

DEPOIS (CORRETO):
┌─────────────────────────────────────────────┐
│ Comissão Base (8%):    R$ 1.679,33 ← CERTO! │
│ Over Price Líquido:    R$ 292,28            │
│ Comissão Total [8.00%] R$ 1.679,33          │
└─────────────────────────────────────────────┘
```

E quando atribuir 5% para a vendedora:
```text
┌─────────────────────────────────────────────┐
│ Comissão (5%):         R$ 83,97   ← 5% de R$ 1.679,33
│ Over (10%):            R$ 29,23   ← 10% de R$ 292,28
│ Total Vendedora:       R$ 113,20            │
└─────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

1. **`src/pages/SalesApproval.tsx`** - Corrigir inicialização de `comissaoTotal` no modo de edição
2. **`src/components/approval/SellerAssignment.tsx`** - Calcular `comissaoEmpresa` independentemente
