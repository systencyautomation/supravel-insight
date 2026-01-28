

# Correção: Layout, Nomenclatura e Cálculo da Comissão

## Problemas Identificados

### 1. Layout dos Botões na Etapa 2 Diferente da Etapa 1

**Etapa 1 (SalesApproval.tsx):**
- Botões ficam no **footer da página** (fora do Card)
- Alinhamento: `flex justify-end gap-3`

**Etapa 2 (SellerAssignment.tsx):**
- Botões ficam no **footer do Card** (dentro do CardContent)
- Alinhamento: `flex justify-between gap-3`

**Solução:** Mover os botões da Etapa 2 para o footer da página (SalesApproval.tsx), igual à Etapa 1. Remover o footer interno do SellerAssignment e deixar os botões no mesmo lugar.

### 2. Comissão da Empresa Sendo Sobrescrita

Ao salvar com vendedor, o campo `commission_calculated` está recebendo o valor do vendedor (R$ 134,19) correto.

**O problema real:** Na seção "Comissão" do SaleDetailSheet, o campo "Comissão Atribuída" mostra R$ 134,19, mas visualmente parece que essa seria a soma de R$ 1.679,33 + R$ 292,28 = R$ 1.971,61.

**Solução:** 
- "Comissão Atribuída" deve mostrar o valor que realmente foi atribuído ao vendedor/representante (R$ 134,19 está correto)
- Adicionar uma linha para "Comissão Total da Empresa" que é R$ 1.679,33 + R$ 292,28 = R$ 1.971,61
- OU remover a soma e deixar claro que são valores separados

### 3. Nome "Comissão" com Porcentagem

Voltar para o nome original:
- **De:** "Comissão Atribuída" (sem %)
- **Para:** "Comissão" (com badge mostrando a %)

---

## Arquivos a Modificar

### 1. `src/components/approval/SellerAssignment.tsx`

Remover o footer interno (linhas 498-521) e passar a responsabilidade para SalesApproval.tsx:

```typescript
// Remover o bloco {!showRejectInput && ( ... )} no final do Card
// O componente agora termina sem o footer de botões
```

### 2. `src/pages/SalesApproval.tsx`

Adicionar footer para step === 2 no mesmo estilo do step === 1:

```typescript
{/* Actions - Step 1 or Step 2 */}
{canApprove && (
  <div className="p-4 border-t bg-card flex justify-end gap-3">
    {step === 1 && isEditMode && (
      <>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancelar
        </Button>
        <Button onClick={handleConfirmCalculations} disabled={!currentSale || !calculationData}>
          Próxima Etapa
        </Button>
      </>
    )}
    {step === 2 && (
      <>
        <Button variant="outline" onClick={isEditMode ? () => navigate(-1) : () => setShowRejectInput(true)}>
          {isEditMode ? 'Cancelar' : 'Rejeitar'}
        </Button>
        <Button onClick={handleStep2Approve}>
          {isEditMode ? 'Salvar Alterações' : 'Aprovar Venda'}
        </Button>
      </>
    )}
  </div>
)}
```

### 3. `src/components/dashboard/SaleDetailSheet.tsx`

Ajustar a seção de Comissão para:
1. Voltar ao nome "Comissão" com badge de porcentagem
2. Calcular o percentual corretamente baseado no total da empresa

```typescript
// Calcular comissão total da empresa
const comissaoEmpresaTotal = ((Number(sale.table_value) || 0) * ((Number(sale.percentual_comissao) || 0) / 100)) + sale.overPriceLiquido;
const percentualCalculado = sale.total_value ? ((Number(sale.commission_calculated) || 0) / sale.total_value) * 100 : 0;

// Na UI:
<div className="flex justify-between text-lg font-bold">
  <div className="flex items-center gap-2">
    <span>Comissão</span>
    <Badge variant="outline" className="text-xs">
      {percentualCalculado.toFixed(2)}%
    </Badge>
  </div>
  <span className="text-primary">{formatCurrency(Number(sale.commission_calculated) || 0)}</span>
</div>
```

---

## Resumo Visual

```text
LAYOUT ATUAL (Etapa 2):
┌─────────────────────────────────────────────────┐
│ Card: Atribuição de Vendedor                    │
│  ┌──────────────────────────────────────────┐   │
│  │ Conteúdo...                              │   │
│  ├──────────────────────────────────────────┤   │
│  │ [Cancelar]     [Salvar Alterações]       │ ← Dentro do Card
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘

LAYOUT CORRETO (igual Etapa 1):
┌─────────────────────────────────────────────────┐
│ Card: Atribuição de Vendedor                    │
│  ┌──────────────────────────────────────────┐   │
│  │ Conteúdo...                              │   │
│  └──────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│        [Cancelar]     [Salvar Alterações]       │ ← Footer da página
└─────────────────────────────────────────────────┘
```

```text
SALEDETAILSHEET - Seção Comissão:
┌─────────────────────────────────────────────────┐
│ % Comissão                                      │
├─────────────────────────────────────────────────┤
│ Comissão Empresa (8%)              R$ 1.679,33  │
│ Over Price Líquido                 R$ 292,28    │
├─────────────────────────────────────────────────┤
│ Comissão                [0.61%]    R$ 134,19    │ ← Nome original + badge
└─────────────────────────────────────────────────┘
```

---

## Arquivos Impactados

| Arquivo | Modificação |
|---------|-------------|
| `SellerAssignment.tsx` | Remover footer interno, expor handlers via callbacks |
| `SalesApproval.tsx` | Adicionar footer unificado para step 1 e step 2 |
| `SaleDetailSheet.tsx` | Voltar nome "Comissão" com badge de porcentagem |

