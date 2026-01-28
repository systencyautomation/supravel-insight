

# Correção: Separação Clara entre Comissão Empresa vs Vendedor

## Problema Raiz

O campo `commission_calculated` no banco está sendo usado para dois propósitos conflitantes:

| Momento | O que guarda | Problema |
|---------|-------------|----------|
| Na aprovação (Etapa 1) | Comissão da empresa (ex: R$ 1.971,61) | OK |
| Na atribuição (Etapa 2) | Total do vendedor (ex: R$ 127,81) | Sobrescreve! |

Quando você edita a comissão do vendedor (Etapa 2), ao salvar, o campo `commission_calculated` recebe o valor do vendedor (linha 203 de SalesApproval.tsx):

```
commission_calculated: assignmentData.comissaoTotalAtribuida
```

Isso faz com que:
1. A próxima edição mostre "Comissão Empresa: R$ 127,81" (errado!)
2. O percentual calculado apareça como 0.58% (127/22.000 × 100)

---

## Solução

### 1. Definir Claramente o Propósito do Campo `commission_calculated`

Este campo deve guardar apenas a **comissão total atribuída** (soma de vendedor + representante). A comissão da empresa NÃO precisa ser salva - pode ser sempre **calculada** como:

```
Comissão Empresa = table_value × (percentual_comissao / 100)
```

### 2. Corrigir Inicialização no Modo Edição (SalesApproval.tsx)

Ao entrar em modo edição com step=2, calcular `comissaoTotal` corretamente a partir dos dados da tabela:

```typescript
// Linha 77 - Já corrigido anteriormente
comissaoTotal: (editableSale.table_value || 0) * ((editableSale.percentual_comissao || 0) / 100),
```

Esta linha já está correta! O problema está em outro lugar.

### 3. Corrigir Exibição da "Comissão Empresa" no SellerAssignment

No `SellerAssignment.tsx` (linha 253-254), o valor exibido como "Comissão Empresa" deve ser recalculado, não pego do `confirmedData`:

Alterar de:
```typescript
<p className="font-semibold text-primary">{formatCurrency(confirmedData.comissaoTotal)}</p>
```

Para:
```typescript
const comissaoEmpresa = confirmedData.valorTabela * (confirmedData.percentualComissao / 100);
<p className="font-semibold text-primary">{formatCurrency(comissaoEmpresa)}</p>
```

### 4. Corrigir SaleDetailSheet para Mostrar Valores Corretos

No `SaleDetailSheet.tsx`, separar a exibição da comissão da empresa e do vendedor:

- **Comissão Base** = `table_value × percentual_comissao` (calculado)
- **Comissão Atribuída** = `commission_calculated` (o que o vendedor recebe)

### 5. Remover Botões Duplicados no Modo Edição Step 2

No `SalesApproval.tsx`, ocultar o footer quando estiver em `step === 2`, pois o `SellerAssignment` já tem seus próprios botões:

```typescript
// Linha 524: adicionar condição
{isEditMode && canApprove && step === 1 && (
```

### 6. Adaptar Botões do SellerAssignment para Modo Edição

Passar prop `isEditMode` para `SellerAssignment` e alterar o texto dos botões:

- Modo Aprovação: "Rejeitar" / "Aprovar Venda"
- Modo Edição: "Cancelar" / "Salvar Alterações"

---

## Arquivos a Modificar

1. **`src/components/approval/SellerAssignment.tsx`**
   - Calcular `comissaoEmpresa` independentemente do `confirmedData.comissaoTotal`
   - Receber prop `isEditMode` para alterar texto dos botões
   - Trocar "Aprovar Venda" → "Salvar Alterações" quando em edição
   - Trocar "Rejeitar" → "Cancelar" quando em edição

2. **`src/pages/SalesApproval.tsx`**
   - Ocultar footer quando `step === 2`
   - Passar `isEditMode` para `SellerAssignment`

3. **`src/components/dashboard/SaleDetailSheet.tsx`**
   - Calcular e exibir "Comissão Empresa" separadamente
   - Se houver atribuição, mostrar também "Comissão Atribuída"

4. **`src/hooks/useSalesWithCalculations.ts`**
   - Melhorar lógica para distinguir comissão empresa vs vendedor

---

## Fluxo Corrigido

```text
┌────────────────────────────────────────────────────────────┐
│ ETAPA 2: Atribuição de Vendedor (Modo Edição)              │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ┌─ Valores Confirmados ──────────────────────────────────┐ │
│ │ Valor Tabela:        R$ 20.991,67                      │ │
│ │ Over Price Líquido:  R$ 292,28                         │ │
│ │ Comissão Empresa:    R$ 1.679,33  ← CALCULADO (8%)     │ │
│ │ Percentual Final:    8.00%                             │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ ┌─ Vendedor Interno ─────────────────────────────────────┐ │
│ │ ☑ Vendedor Interno                                     │ │
│ │ [Tainã Marques ▼]    [0,5] % sobre Tabela              │ │
│ │                                                        │ │
│ │ Tabela (0,5%):       R$ 104,96                         │ │
│ │ Over (10%):          R$ 29,23                          │ │
│ │ ─────────────────────────────                          │ │
│ │ Total:               R$ 134,19                         │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ ┌─ Total a Pagar ────────────────────────────────────────┐ │
│ │ Total Atribuído:     R$ 134,19                         │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│             [Cancelar]        [Salvar Alterações]          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Resumo das Mudanças

| Arquivo | Mudança |
|---------|---------|
| SellerAssignment.tsx | Calcular comissaoEmpresa localmente; Receber isEditMode; Alterar texto botões |
| SalesApproval.tsx | Ocultar footer em step=2; Passar isEditMode |
| SaleDetailSheet.tsx | Separar comissão empresa vs atribuída |
| useSalesWithCalculations.ts | Distinguir comissão empresa vs vendedor |

