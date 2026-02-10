
# Nova Pagina de Pendencias + Ajustes no Fluxo

## Resumo

1. Criar uma nova pagina `/pendencias` que exibe todas as vendas pendentes em lista completa
2. Ajustar o dropdown de notificacoes (icone Bell) para mostrar ate 5 vendas, cada uma linkando direto para `/aprovacao?saleId=XXX`
3. O botao "Ver todas" no dropdown leva para `/pendencias`
4. Na pagina `/aprovacao`, remover a aba "Lista" do painel esquerdo, deixando apenas a Tabela (SpreadsheetViewer) ocupando o painel inteiro
5. Apos aprovar/rejeitar uma venda em `/aprovacao`, redirecionar de volta para `/pendencias`

## Arquivos afetados

### 1. `src/pages/Pendencias.tsx` (novo)

Nova pagina com lista completa de vendas pendentes. Layout simples com DashboardHeader, titulo "Vendas Pendentes" e uma lista/tabela com todas as vendas. Cada item e clicavel e navega para `/aprovacao?saleId={id}`. Exibe NF-e, Cliente, Valor, UF e data.

### 2. `src/App.tsx`

Adicionar rota `/pendencias` apontando para o novo componente.

### 3. `src/components/PendingSalesNotification.tsx`

- Manter badge com contagem (max "9+")
- Cada item do dropdown navega para `/aprovacao?saleId={sale.id}` (direto para a calculadora daquela venda)
- "Ver todas" navega para `/pendencias`

### 4. `src/pages/SalesApproval.tsx`

- Remover o componente `PendingSalesList` e a logica de Tabs ("Lista" / "Tabela") do painel esquerdo
- O painel esquerdo volta a exibir apenas a Tabela/SpreadsheetViewer por inteiro (como era antes)
- Manter a logica de `selectedSaleId` via URL param para estabilidade
- Apos aprovar ou rejeitar uma venda, redirecionar para `/pendencias` ao inves de ficar na mesma pagina

### 5. `src/components/approval/PendingSalesList.tsx`

Remover este arquivo (nao sera mais usado na pagina de aprovacao; a nova pagina de pendencias tera sua propria lista inline).

## Secao Tecnica

### Pagina Pendencias

```text
/pendencias
+----------------------------------+
| DashboardHeader                  |
+----------------------------------+
| <- Voltar    Vendas Pendentes (N)|
+----------------------------------+
| NFe 123 | Cliente X | R$ 20.600 |
| NFe 456 | Cliente Y | R$ 15.300 |
| NFe 789 | Cliente Z | R$ 42.100 |
| ...                              |
+----------------------------------+
```

Cada linha e um botao/link que faz `navigate('/aprovacao?saleId=XXX')`.

### Fluxo apos aprovar/rejeitar em `/aprovacao`

No `handleApproveWithAssignment` e `handleReject`, substituir a logica de "selecionar proxima venda" por `navigate('/pendencias')`.

### Dropdown de notificacoes

Cada `DropdownMenuItem` passa a navegar para `/aprovacao?saleId={sale.id}` ao inves de apenas `/aprovacao`. O "Ver todas" navega para `/pendencias`.

### SalesApproval - painel esquerdo simplificado

Remover as Tabs e o PendingSalesList. O painel esquerdo fica apenas com o Card contendo o SpreadsheetViewer (ou mensagem "Nenhuma planilha importada").
