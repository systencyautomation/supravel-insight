
# Pre-Calculo Automatico pela IA no Processamento da Venda

## Resumo

Atualmente, quando uma venda chega via n8n, ela entra na lista de pendencias com status "pendente" mas sem calculos financeiros preenchidos. O usuario precisa abrir a calculadora e preencher manualmente valores de tabela, comissao, etc.

A proposta e mover essa inteligencia para o backend: ao processar o XML e os boletos, o sistema tambem consulta a tabela FIPE da organizacao, faz o match do produto, calcula Over Price, deducoes fiscais e comissao -- tudo automaticamente. A venda chega na lista de pendencias ja com todos os campos financeiros pre-preenchidos.

O usuario continua sendo obrigatorio no fluxo: ele revisa os valores, ajusta se necessario, atribui o vendedor e aprova.

## Fluxo Atualizado

```text
n8n --> parse-nfe-xml (edge function)
          |
          +--> 1. Parseia XML (ja existe)
          +--> 2. Salva documentos no Storage (ja existe)
          +--> 3. Extrai boletos do PDF via IA (ja existe)
          +--> 4. [NOVO] Busca tabela FIPE da organizacao
          +--> 5. [NOVO] Match do produto (codigo FIPE)
          +--> 6. [NOVO] Calcula: valor tabela, ICMS, Over Price, deducoes, comissao
          +--> 7. Insere venda com campos financeiros pre-preenchidos
          +--> Status: "pendente" (aguarda aprovacao humana)

Humano --> Lista de Pendencias --> Abre Aprovacao
          +--> Ve valores ja preenchidos pela IA
          +--> Ajusta se necessario
          +--> Atribui vendedor
          +--> Aprova --> Dashboard
```

## Mudancas Tecnicas

### 1. Edge Function `parse-nfe-xml` -- Adicionar Pre-Calculo

Apos inserir a venda e processar boletos, adicionar logica para:

a) **Buscar tabela FIPE** da organizacao no banco (`fipe_documents`)
b) **Match do produto** usando `produto_modelo` ou `produto_codigo` (mesma logica que ja existe no `CommissionCalculator.tsx` -- busca por "Cod. Interno" no header da planilha)
c) **Extrair valores**: `valorTabela`, `icmsTabela` (detectar qual coluna 4%/7%/12% tem valor), `percentualComissao`
d) **Calcular ICMS destino** a partir da UF do destinatario
e) **Calcular Valor Real** (VP) usando entrada + parcelas com taxa de 2.2%
f) **Calcular Over Price** = Valor Real - Valor Tabela Ajustado
g) **Calcular deducoes em cascata**: ICMS, PIS/COFINS, IR/CSLL
h) **Calcular comissao** = Comissao Pedido + Over Liquido
i) **Atualizar a venda** com todos esses campos pre-preenchidos

### 2. Novo campo `ai_pre_calculated` na tabela `sales`

Adicionar uma coluna booleana `ai_pre_calculated` (default false) para indicar que os calculos foram feitos automaticamente pela IA/sistema. Isso permite:
- Mostrar um selo visual na lista de pendencias ("Calculado automaticamente")
- O frontend saber que os valores ja estao preenchidos
- Diferenciar vendas que foram calculadas automaticamente vs manualmente

### 3. UI -- Indicador visual na lista de pendencias

Na pagina `/pendencias`, vendas com `ai_pre_calculated = true` mostram um badge indicando que os calculos ja foram feitos. O usuario sabe que pode revisar e aprovar rapidamente.

### 4. UI -- Calculadora em modo "revisao"

Quando a venda tem `ai_pre_calculated = true`, a calculadora abre com todos os campos ja preenchidos. O usuario pode:
- Revisar os valores (tudo editavel como antes)
- Ir direto para a Etapa 2 (atribuicao de vendedor) se os valores estiverem corretos
- Ajustar qualquer valor se necessario

## Arquivos Afetados

1. **Migration SQL** -- adicionar coluna `ai_pre_calculated` na tabela `sales`
2. **`supabase/functions/parse-nfe-xml/index.ts`** -- adicionar logica de busca FIPE + calculo de comissao apos inserir a venda
3. **`src/pages/Pendencias.tsx`** -- mostrar badge "Calculado" em vendas pre-calculadas
4. **`src/components/approval/CommissionCalculator.tsx`** -- pequenos ajustes para indicar visualmente que valores vieram do sistema

## Logica de Match FIPE no Backend

A logica sera portada do `CommissionCalculator.tsx` (linhas 99-217) para o backend. Resumo:

1. Buscar `fipe_documents.rows` da organizacao
2. Encontrar header row com "Cod. Interno"
3. Encontrar colunas de valor (12%, 7%, 4%) e comissao
4. Buscar o `produto_modelo` ou `produto_codigo` nas linhas
5. Extrair valor da coluna com ICMS disponivel (prioridade: 4% > 7% > 12%)
6. Retornar `valorTabela`, `icmsTabela`, `percentualComissao`

## Logica de Calculo no Backend

Portar a logica de `approvalCalculator.ts` para o backend:

1. `calcularValorReal()` -- VP das parcelas
2. `calculateApprovalCommission()` -- Over Price + deducoes + comissao
3. Gravar `table_value`, `percentual_comissao`, `icms_tabela`, `percentual_icms`, `over_price`, `over_price_liquido`, `icms`, `pis_cofins`, `ir_csll`, `commission_calculated`, `ai_pre_calculated` na venda

## Consideracoes

- Se a organizacao nao tiver tabela FIPE cadastrada, os calculos nao sao feitos e a venda entra sem pre-calculo (comportamento atual)
- Se o produto nao for encontrado na tabela, os calculos tambem nao sao feitos
- O campo `ai_pre_calculated` so e marcado como true quando TODOS os calculos foram realizados com sucesso
- O usuario SEMPRE precisa aprovar -- nenhuma venda vai direto para o dashboard
- Vendas sem pre-calculo continuam funcionando normalmente (preenchimento manual)
