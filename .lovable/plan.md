

# Sistema de Documentos e Extração Inteligente de Boletos

## Resumo

O n8n passa a enviar apenas os **arquivos brutos** (XML como texto, PDFs como base64). O sistema assume toda a inteligência:

1. **Armazena** os documentos (XML, DANFE, Boleto) em storage vinculados a cada venda
2. **Parseia** o XML (ja existe)
3. **Extrai boletos do PDF** usando IA -- cada organizacao configura sua propria API key
4. Documentos ficam disponiveis para consulta no sistema

## Arquitetura do Fluxo

```text
n8n (email) --> parse-nfe-xml (edge function)
                  |
                  +--> 1. Parseia XML (ja existe)
                  +--> 2. Salva documentos no Storage (novo)
                  +--> 3. Insere venda no banco (ja existe)
                  +--> 4. Chama extract-boleto-pdf (novo) se tiver PDF
                            |
                            +--> Usa AI API key da org
                            +--> Extrai valores/vencimentos
                            +--> Insere installments
```

## Mudancas

### 1. Banco de Dados

**Tabela `sale_documents`** (nova) -- vincula arquivos a vendas:
- `id` (uuid, PK)
- `organization_id` (uuid, FK organizations)
- `sale_id` (uuid, FK sales)
- `document_type` (text: 'xml', 'danfe', 'boleto')
- `filename` (text)
- `storage_path` (text) -- caminho no bucket
- `file_size` (integer)
- `created_at` (timestamptz)

**Coluna `ai_api_key`** na tabela `organizations` (text, nullable) -- cada org configura sua chave de IA.

**Storage bucket** `sale-documents` (privado) -- armazena os arquivos.

### 2. Edge Function `extract-boleto-pdf` (nova)

Recebe o PDF do boleto (base64), o `organization_id` e o `sale_id`. Busca a `ai_api_key` da organizacao. Envia o PDF para o modelo de IA (Lovable AI como fallback se a org nao tiver chave propria, ou retorna erro pedindo configuracao). O modelo extrai: valor de cada boleto, data de vencimento, numero do boleto. Insere os installments na tabela e calcula a entrada.

Usa a mesma logica de reconciliacao que ja existe no `parse-nfe-xml` (primeiro boleto com vencimento proximo da emissao = entrada).

### 3. Edge Function `parse-nfe-xml` (ajustes)

Passa a aceitar campos adicionais no body:
- `danfe_base64` (string, opcional) -- PDF do DANFE
- `boleto_base64` (string, opcional) -- PDF do boleto

Apos inserir a venda:
1. Salva os documentos no storage bucket `sale-documents`
2. Registra na tabela `sale_documents`
3. Se `boleto_base64` estiver presente, chama `extract-boleto-pdf` internamente

Se nao houver boleto PDF, continua usando o fallback das duplicatas do XML (comportamento atual).

### 4. UI -- Configuracao da API Key de IA

Na pagina de Integracoes (`src/components/tabs/Integrations.tsx`), adicionar um novo Card:

- Titulo: "Inteligencia Artificial"
- Descricao: "Configure sua chave de API para extração automatica de boletos"
- Campo: API Key (password input)
- Informacao: "A chave é usada para extrair automaticamente valores e vencimentos de boletos em PDF"

### 5. UI -- Visualizacao de Documentos na Venda

No `CommissionCalculator.tsx` ou na pagina de detalhes da venda, adicionar uma secao "Documentos" que lista os arquivos vinculados (XML, DANFE, Boleto) com opcao de download/visualizacao.

### 6. Hook `useOrganizationSettings`

Adicionar `ai_api_key` ao tipo `OrganizationSettings` e ao select/update do hook.

## Arquivos afetados

1. **Migration SQL** -- criar tabela `sale_documents`, coluna `ai_api_key`, bucket `sale-documents`
2. **`supabase/functions/extract-boleto-pdf/index.ts`** (novo) -- extrai dados do boleto via IA
3. **`supabase/functions/parse-nfe-xml/index.ts`** -- aceitar PDFs base64, salvar no storage, chamar extract-boleto
4. **`supabase/config.toml`** -- registrar nova function
5. **`src/components/tabs/Integrations.tsx`** -- card de configuracao da API key de IA
6. **`src/hooks/useOrganizationSettings.ts`** -- incluir `ai_api_key`
7. **`src/components/approval/CommissionCalculator.tsx`** -- secao de documentos vinculados (download/view)

## Prompt de IA para Extracao de Boleto

O prompt enviado ao modelo sera algo como:

> "Analise este PDF de boleto bancario. Extraia TODOS os boletos encontrados no documento. Para cada boleto retorne: valor (numerico), data de vencimento (formato YYYY-MM-DD), e numero do boleto se visivel. Use a tool `extract_boletos` para retornar os dados."

Usando tool calling para garantir resposta estruturada (como recomendado pela documentacao do Lovable AI).

## Modelo de IA

- Se a organizacao tiver `ai_api_key` configurada, usa a chave dela com o Lovable AI Gateway
- Se nao tiver, retorna erro indicando que precisa configurar a chave
- Modelo padrao: `google/gemini-2.5-flash` (bom custo-beneficio para analise de PDF)

## Consideracoes

- Os PDFs sao enviados como base64 no JSON (opcao mais simples para integracao com n8n)
- Limite pratico de ~10MB por PDF (suficiente para boletos)
- Storage com RLS: apenas membros da organizacao podem acessar os documentos
- A chave de IA fica armazenada no banco (coluna `ai_api_key` na organizations), protegida por RLS

