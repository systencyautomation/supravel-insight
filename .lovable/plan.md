
# Chat Flutuante com IA para Consulta de Dados

## Objetivo
Adicionar um botao flutuante de chat no canto inferior direito da tela, disponivel em todas as paginas do sistema, restrito aos cargos **Gerente** (admin) e **Analista** (manager). Ao clicar, abre um painel de chat onde o usuario pode fazer perguntas em linguagem natural sobre os dados da organizacao.

## Como vai funcionar

1. Botao flutuante (icone de chat) no canto inferior direito, visivel em todas as paginas
2. Ao clicar, abre um painel/drawer com a interface de chat
3. A IA recebe dados reais da organizacao (vendas, parcelas, estoque) como contexto
4. Respostas em streaming, token a token
5. Somente usuarios com cargo **admin** ou **manager** veem o botao

## Componentes a criar

### 1. Edge Function `chat-data-assistant`
- Recebe mensagens do chat + token JWT do usuario
- Extrai o `user_id` do JWT, busca o `organization_id` na tabela `user_roles`
- Valida que o cargo e `admin` ou `manager`
- Consulta dados da organizacao (usando service role):
  - Ultimas 50 vendas (cliente, NF, valor, status, comissao)
  - Parcelas pendentes/vencidas
  - Resumo do estoque (modelos, precos, quantidades)
- Monta system prompt com contexto real e envia para Lovable AI (Gemini Flash)
- Retorna streaming SSE

### 2. Componente `src/components/chat/FloatingChat.tsx`
- Botao flutuante posicionado `fixed bottom-6 right-6`
- Ao clicar, abre um painel de chat (card com ~400px de largura e ~500px de altura)
- Interface de chat com:
  - Historico de mensagens com scroll
  - Input de texto
  - Streaming de respostas (reutiliza padrao do AIAnalyst)
  - Sugestoes rapidas ("Total de vendas este mes", "Parcelas vencidas", "Resumo do estoque")
- Botao de fechar para minimizar

### 3. Componente `src/components/chat/FloatingChatWrapper.tsx`
- Wrapper que verifica o cargo do usuario via `usePermissions` / `useAuth`
- Se o cargo for `admin` ou `manager`, renderiza o FloatingChat
- Caso contrario, nao renderiza nada

### 4. Integracao no App.tsx
- Adicionar o `FloatingChatWrapper` dentro do `BrowserRouter` para que apareca em todas as rotas

## Detalhes Tecnicos

### Edge Function - Seguranca
- JWT validado via `getClaims()` para extrair `user_id`
- Consulta `user_roles` para verificar cargo e obter `organization_id`
- Rejeita com 403 se o cargo nao for `admin` ou `manager`
- Dados consultados apenas da organizacao do usuario

### Controle de visibilidade no frontend
- Usa o hook `useAuth()` para verificar `userRoles`
- Verifica se o cargo na organizacao efetiva e `admin` ou `manager`
- Nao exibe na pagina `/auth`, `/onboarding`, `/join`, `/master`

### Arquivos

| Arquivo | Acao |
|---|---|
| `supabase/functions/chat-data-assistant/index.ts` | Criar |
| `src/components/chat/FloatingChat.tsx` | Criar |
| `src/components/chat/FloatingChatWrapper.tsx` | Criar |
| `src/App.tsx` | Modificar - adicionar FloatingChatWrapper |
| `supabase/config.toml` | Atualizar - registrar nova function |
