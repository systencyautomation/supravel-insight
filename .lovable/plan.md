

# Correção: Separar Comissão da Empresa vs Comissão do Vendedor

## Problema Identificado

O campo `commission_calculated` está salvando a comissão do **vendedor** (R$ 134,19), mas a aba da **Empresa** exibe esse valor como se fosse a comissão da empresa.

### Fluxo Atual

| Passo | O que acontece | Problema |
|-------|---------------|----------|
| Etapa 2 Salva | `commission_calculated = R$ 134,19` (vendedor) | OK - salva corretamente |
| Aba Empresa | Lê `commission_calculated = R$ 134,19` | ERRADO - mostra comissão do vendedor |
| Hook | `valorComissaoCalculado = comissaoSalva` | ERRADO - deveria ser comissão da empresa |

### Regra de Negócio

- **Aba Empresa**: deve mostrar a comissão **da empresa** = (Tabela × %) + Over Líquido = R$ 1.679,33 + R$ 292,28 = R$ 1.971,61
- **Aba Vendedores**: deve mostrar a comissão **do vendedor** = R$ 134,19

---

## Solução

### 1. Modificar `useSalesWithCalculations.ts`

**Mudar a lógica**: Quando `commission_calculated` existir, NÃO usar diretamente para `valorComissaoCalculado`. Em vez disso:

```typescript
// SEMPRE calcular a comissão da empresa dinamicamente
const percentualComissaoBase = Number(sale.percentual_comissao) || 8;
const comissaoEmpresaBase = tableValue * (percentualComissaoBase / 100);

// Calcular Over Price
const overPriceBruto = valorReal - tableValue;
const overPriceLiquido = overPriceBruto * (1 - 0.0925 - 0.34 - icmsDestino);

// Comissão da empresa = base + over líquido
const valorComissaoEmpresa = comissaoEmpresaBase + overPriceLiquido;
const percentualComissaoEmpresa = totalValue > 0 ? (valorComissaoEmpresa / totalValue) * 100 : 0;
```

O `commission_calculated` do banco será guardado em um campo separado: `comissaoAtribuida` para uso na aba de vendedores.

### 2. Adicionar Campo `comissaoAtribuida` ao Hook

Novo campo na interface `SaleWithCalculations`:

```typescript
export interface SaleWithCalculations extends SaleWithDetails {
  // ... outros campos
  
  // Comissão da empresa (calculada)
  valorComissaoCalculado: number;   // Empresa = base + over
  percentualComissaoCalculado: number;
  
  // Comissão atribuída (salva no banco)
  comissaoAtribuida: number;        // O que o vendedor/rep recebe
}
```

### 3. Ajustar Exibição na Aba Empresa

**`SalesListTable.tsx`** já usa `valorComissaoCalculado`, que agora terá o valor correto da empresa.

### 4. Ajustar Exibição na Aba Vendedores

**`InternalSellerCommissions.tsx`** deve usar `comissaoAtribuida` (o novo campo) em vez de `valorComissaoCalculado`.

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/hooks/useSalesWithCalculations.ts` | Calcular `valorComissaoCalculado` como comissão da empresa; Adicionar campo `comissaoAtribuida` |
| `src/components/tabs/InternalSellerCommissions.tsx` | Usar `comissaoAtribuida` para exibir valor do vendedor |
| `src/components/tabs/RepresentativeCommissions.tsx` | Usar `comissaoAtribuida` para exibir valor do representante |

---

## Resumo Visual

```text
BANCO DE DADOS:
┌─────────────────────────────────────────────────┐
│ commission_calculated = R$ 134,19 (vendedor)    │
│ table_value = R$ 20.991,67                      │
│ percentual_comissao = 8%                        │
│ over_price_liquido = R$ 292,28                  │
└─────────────────────────────────────────────────┘

useSalesWithCalculations (CORRIGIDO):
┌─────────────────────────────────────────────────┐
│ // Comissão da empresa (calculada)              │
│ comissaoEmpresaBase = 20.991,67 × 8% = 1.679,33 │
│ valorComissaoCalculado = 1.679,33 + 292,28      │
│                       = R$ 1.971,61             │
│                                                 │
│ // Comissão atribuída (do banco)                │
│ comissaoAtribuida = R$ 134,19                   │
└─────────────────────────────────────────────────┘

ABA EMPRESA (usa valorComissaoCalculado):
┌─────────────────────────────────────────────────┐
│ Comissão: R$ 1.971,61 ← CORRETO!                │
└─────────────────────────────────────────────────┘

ABA VENDEDORES (usa comissaoAtribuida):
┌─────────────────────────────────────────────────┐
│ Total do Vendedor: R$ 134,19 ← CORRETO!         │
└─────────────────────────────────────────────────┘
```

