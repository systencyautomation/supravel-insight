
## Plano: Editar Cálculos de Vendas Aprovadas

### Objetivo
Permitir que vendas já aprovadas possam ser reeditadas através da calculadora de comissão para corrigir valores incorretos.

### Fluxo Atual vs. Novo Fluxo

| Situação | Atual | Novo |
|----------|-------|------|
| Venda **Pendente** | Aparece na fila de aprovação, pode ser editada | Sem mudança |
| Venda **Aprovada** | Apenas visualização no Sheet | Botão "Editar Cálculos" → abre calculadora |
| Venda **Paga** | Apenas visualização | Botão "Editar Cálculos" → abre calculadora |

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/SalesApproval.tsx` | Aceitar vendas de qualquer status (não só pendentes) via query param |
| `src/components/dashboard/SaleDetailSheet.tsx` | Adicionar botão "Editar Cálculos" para vendas aprovadas/pagas |
| `src/components/vendas/SalesListTable.tsx` | Adicionar ação rápida "Editar" na coluna de ações |
| `src/hooks/usePendingSales.ts` | Criar função auxiliar para carregar venda específica por ID |

---

### Mudanças Detalhadas

#### 1. SaleDetailSheet.tsx
Adicionar botão "Editar Cálculos" para vendas com status "aprovado" ou "pago":

```text
┌─────────────────────────────────────┐
│  Detalhes da Venda      [Aprovado]  │
├─────────────────────────────────────┤
│  Cliente: ...                       │
│  Produto: ...                       │
│  Valor: ...                         │
│  ...                                │
├─────────────────────────────────────┤
│  [🔧 Editar Cálculos]   << NOVO     │
└─────────────────────────────────────┘
```

Ao clicar, navega para `/aprovacao?saleId=X&mode=edit`

#### 2. SalesApproval.tsx
- Aceitar parâmetro `mode=edit` na URL
- Quando em modo edição:
  - Carregar a venda específica (mesmo que não seja pendente)
  - Mostrar header indicando "Modo Edição"
  - Manter a mesma calculadora
  - Ao salvar, atualizar os campos mas manter o status atual

#### 3. SalesListTable.tsx
Adicionar ícone de edição (lápis) na coluna de ações para vendas aprovadas:

```text
| ... | Status   | Ações    |
|-----|----------|----------|
| ... | Aprovado | 👁️  ✏️  |
```

---

### Lógica de Permissões
- Apenas usuários com permissão de aprovação (`admin`, `manager`) poderão editar
- Manter registro de quem editou (`aprovado_por`) e quando (`aprovado_em`)

---

### Resultado Esperado
1. Na tabela de vendas, clicar no ícone ✏️ de uma venda aprovada
2. Abre a página de aprovação em modo edição
3. Ajustar os valores na calculadora (Valor Tabela, %, ICMS, etc.)
4. Clicar "Salvar Alterações"
5. Venda mantém status atual mas com cálculos corrigidos

---

### Seção Técnica

**Novo hook: `useEditableSale.ts`**
- Carrega venda específica por ID independente do status
- Reutiliza lógica de installments existente

**Modificação em SalesApproval:**
- Detectar `mode=edit` nos search params
- Se modo edição: buscar venda por ID diretamente
- Botão de ação muda de "Aprovar" para "Salvar Alterações"

**Modificação em handleApprove (renomeado para handleSave):**
```typescript
// Em modo edição, NÃO atualizar status
const updateData = {
  table_value: calculationData.valorTabela,
  percentual_comissao: calculationData.percentualComissao,
  // ... demais campos de cálculo
  // Se modo edição, manter status atual
  ...(isEditMode ? {} : { status: 'aprovado', aprovado_por: user.id })
};
```
