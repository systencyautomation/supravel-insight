
# Plano: Botão de Editar na Tabela de Comissões do Vendedor

## Resumo
Adicionar um botão de edição na linha expandida da tabela de comissões do vendedor interno. O botão levará diretamente à Etapa 2 do fluxo de aprovação (atribuição de vendedor/comissão), permitindo ajustar a comissão de vendas já aprovadas. O botão só será visível para usuários com permissão `approve_sales`.

---

## Arquivos a Modificar

### 1. `src/pages/SalesApproval.tsx`
- Adicionar suporte ao query param `step=2` para iniciar diretamente na etapa 2
- Quando `mode=edit` e `step=2`, carregar os dados confirmados da venda existente e ir direto para SellerAssignment

### 2. `src/components/tabs/InternalSellerCommissions.tsx`
- Importar `usePermissions` hook
- Importar `useNavigate` do react-router-dom
- Importar ícone `Pencil` do lucide-react
- Adicionar botão "Editar" na seção expandida
- Verificar permissão `approve_sales` antes de exibir o botão
- Ao clicar, navegar para `/sales-approval?mode=edit&saleId={id}&step=2`

---

## Detalhes Técnicos

### Navegação para Edição
```typescript
// InternalSellerCommissions.tsx
const navigate = useNavigate();
const { hasPermission } = usePermissions();

const canEditCommission = hasPermission('approve_sales');

const handleEditCommission = (saleId: string) => {
  navigate(`/sales-approval?mode=edit&saleId=${saleId}&step=2`);
};
```

### Modificação no SalesApproval.tsx
```typescript
// Ler step inicial da URL
const initialStep = searchParams.get('step') === '2' ? 2 : 1;

// Para edit mode com step=2, precisamos carregar os dados calculados existentes
useEffect(() => {
  if (isEditMode && initialStep === 2 && editableSale) {
    // Construir confirmedCalculation a partir dos dados existentes da venda
    setConfirmedCalculation({
      valorTabela: editableSale.table_value || 0,
      percentualComissao: editableSale.percentual_comissao || 0,
      overPriceLiquido: editableSale.over_price_liquido || 0,
      comissaoTotal: editableSale.commission_calculated || 0,
      // ... outros campos
    });
    setStep(2);
  }
}, [isEditMode, initialStep, editableSale]);
```

### Layout do Botão na Linha Expandida
```text
┌─────────────────────────────────────────────────────────────────┐
│  Comissão Base                    │  Over Price                 │
│  Base (Tabela): R$ 20.991,67      │  Over Líquido: R$ 5.420,00  │
│  Percentual: 3%                   │  Percentual: 10%            │
│  Resultado: R$ 629,75             │  Resultado: R$ 542,00       │
├─────────────────────────────────────────────────────────────────┤
│  Total Vendedor: R$ 1.171,75                      [✏️ Editar]   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fluxo de Usuário

1. Usuário acessa Comissões > Vendedor
2. Expande uma linha para ver detalhes
3. Se tem permissão `approve_sales`, vê botão "Editar"
4. Clica no botão
5. É redirecionado para `/sales-approval?mode=edit&saleId=xxx&step=2`
6. Página carrega com os dados da venda e vai direto para Etapa 2
7. Pode alterar vendedor interno, representante e percentuais
8. Salva as alterações

---

## Segurança

- Permissão verificada no frontend via `usePermissions().hasPermission('approve_sales')`
- Backend já protege via RLS na tabela `sales` (apenas admin/manager podem modificar)
- Botão completamente oculto para usuários sem permissão

---

## Ordem de Implementação

1. Modificar `SalesApproval.tsx` para suportar `step=2` na URL e inicializar corretamente
2. Atualizar `InternalSellerCommissions.tsx` adicionando o botão com verificação de permissão
3. Testar fluxo completo de edição
