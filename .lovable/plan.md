

# ✅ CONCLUÍDO: Correção de Layout, Nomenclatura e Cálculo da Comissão

## Alterações Realizadas

### 1. Layout dos Botões na Etapa 2 (Igual Etapa 1)
- **SellerAssignment.tsx**: Removido footer interno (botões dentro do Card)
- **SalesApproval.tsx**: Adicionado footer unificado para step 1 e step 2 no mesmo local
- Usado `forwardRef` + `useImperativeHandle` para expor métodos `triggerApprove` e `triggerReject`

### 2. Nomenclatura "Comissão" com Badge de %
- **SaleDetailSheet.tsx**: Alterado de "Comissão Atribuída" para "Comissão" com badge mostrando o percentual calculado

### 3. Separação Visual Clara
- Comissão Empresa (calculada): valor tabela × percentual
- Over Price Líquido: mostrado separadamente
- Comissão (salva no banco): valor atribuído ao vendedor/representante com badge de %

## Arquivos Modificados

| Arquivo | Modificação |
|---------|-------------|
| `SellerAssignment.tsx` | Convertido para forwardRef, removido footer interno, exposto handlers via imperative handle |
| `SalesApproval.tsx` | Adicionado ref para SellerAssignment, footer unificado para step 1 e step 2 |
| `SaleDetailSheet.tsx` | Alterado nome para "Comissão" com badge de porcentagem |

