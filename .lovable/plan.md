
# Correção: Cálculo de Comissões do Vendedor

## Problema Identificado

Analisando os dados do banco e os prints, identifiquei **dois problemas críticos**:

### 1. Percentual do Vendedor Não Está Sendo Salvo

**No banco de dados:**
- `percentual_comissao` = **8.00** (percentual da EMPRESA)
- `commission_calculated` = **127.81** (total que a VENDEDORA recebe)

**O que falta:**
- Não existe campo para guardar o **5%** que foi definido para a vendedora na Etapa 2

### 2. Base de Cálculo Confusa na Tabela de Comissões

**O que está acontecendo (ERRADO):**
- `Base (Comissão)` = R$ 127,81 - está usando o **total do vendedor** como base!
- `Percentual` = 8% - está usando o **percentual da empresa**, não do vendedor
- `Resultado` = 8% × 127,81 = **R$ 10,22** (incorreto)

**O que deveria acontecer (CORRETO):**
- `Base (Comissão)` = R$ 1.971,61 (Comissão da Empresa = 8% do Valor Tabela aprox.)
- `Percentual` = 5% (definido na aprovação)
- `Resultado` = 5% × R$ 1.971,61 = **R$ 98,58**

---

## Solução Proposta

### Etapa 1: Adicionar Campos na Tabela `sales`

Criar migração SQL para adicionar:
- `internal_seller_percent` (numeric) - percentual do vendedor interno
- `representative_percent` (numeric) - percentual do representante

### Etapa 2: Atualizar Aprovação para Salvar Percentuais

Modificar `src/pages/SalesApproval.tsx` para incluir no update:
```typescript
internal_seller_percent: assignmentData.internalSellerPercent,
representative_percent: assignmentData.representativePercent,
```

### Etapa 3: Corrigir Lógica na Tabela de Comissões

Modificar `src/components/tabs/InternalSellerCommissions.tsx`:

```typescript
// ANTES (errado):
const comissaoEmpresa = sale.valorComissaoCalculado || 0; // 127,81 = total vendedor
const baseCalculo = comissaoBase === 'valor_tabela' ? valorTabela : comissaoEmpresa;
const percentualVendedor = Number(sale.percentual_comissao) || 3; // 8% = empresa

// DEPOIS (correto):
const percentualEmpresa = Number(sale.percentual_comissao) || 8;
const comissaoEmpresa = valorTabela * (percentualEmpresa / 100); // R$ 1.679,33
const baseCalculo = comissaoBase === 'valor_tabela' ? valorTabela : comissaoEmpresa;
const percentualVendedor = Number(sale.internal_seller_percent) || 0; // 5% = vendedor
```

---

## Arquivos a Modificar

1. **Migração SQL** - Adicionar campos `internal_seller_percent` e `representative_percent`
2. **`src/pages/SalesApproval.tsx`** - Salvar os percentuais individuais
3. **`src/components/tabs/InternalSellerCommissions.tsx`** - Corrigir lógica de cálculo
4. **`src/hooks/useOrganizationData.ts`** (se necessário) - Garantir que os novos campos sejam lidos

---

## Resumo Visual da Correção

```
ANTES (ERRADO):
┌─────────────────────────────────────────────┐
│ Base (Comissão):    R$ 127,81   ← TOTAL VENDEDOR (errado!)
│ Percentual:         8%          ← DA EMPRESA (errado!)
│ Resultado:          R$ 10,22    ← CONSEQUÊNCIA (errado!)
└─────────────────────────────────────────────┘

DEPOIS (CORRETO):
┌─────────────────────────────────────────────┐
│ Base (Comissão):    R$ 1.679,33 ← COMISSÃO DA EMPRESA
│ Percentual:         5%          ← DO VENDEDOR
│ Resultado:          R$ 83,97    ← CORRETO
└─────────────────────────────────────────────┘
```

Nota: O valor exato da "Comissão Empresa" pode variar dependendo de como é calculado na Etapa 1 (pode incluir ajustes de ICMS, Over líquido, etc.). A lógica final deve usar o mesmo cálculo que aparece na tela de aprovação (R$ 1.971,61).
