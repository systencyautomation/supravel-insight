

# Estruturar Base para o Modulo "Analista de IA"

## Analise do Estado Atual vs. Solicitado

Antes de propor mudancas, e importante mapear o que ja existe para nao duplicar colunas ou quebrar funcionalidades.

### 1. Tabela Organizations -- Campos de Configuracao

| Campo Solicitado | Ja Existe? | Nome Atual | Observacao |
|---|---|---|---|
| `commission_model` (enum: total_value, company_margin) | SIM | `comissao_base` (text, default 'valor_tabela') | Armazena 'valor_tabela' ou 'comissao_empresa'. Mesmo conceito, nomes diferentes. |
| `default_company_rate` (float) | SIM | `comissao_over_percent` (numeric, default 10) | Percentual do Over que vendedor recebe. Ja configuravel na UI. |
| `api_key_llm` (password/text) | SIM | `ai_api_key` (text) | Chave da API de IA. Ja usada no `parse-nfe-xml`. |

**Conclusao**: Os tres campos ja existem com nomes ligeiramente diferentes. Estao integrados em:
- `useOrganizationSettings.ts` (hook)
- `CommissionParametersForm.tsx` (UI de configuracao)
- `parse-nfe-xml` edge function (uso da chave IA)
- `CommissionCalculator.tsx` (calculo de comissao)

**Acao recomendada**: Nao renomear (evita refactor massivo). Manter os nomes atuais que ja estao em producao.

---

### 2. Tabela Sales -- Colunas de Produto e Calculo

| Campo Solicitado | Ja Existe? | Nome Atual | Observacao |
|---|---|---|---|
| `produto_marca` | SIM | `produto_marca` (text) | Identico |
| `produto_modelo` | SIM | `produto_modelo` (text) | Identico -- usado como codigo FIPE |
| `produto_numero_serie` | SIM | `produto_numero_serie` (text) | Identico |
| `entrada_calculada` | NAO | `valor_entrada` existe mas e a entrada do boleto, nao a calculada | **PRECISA ADICIONAR** |
| `valor_presente` | NAO | Calculado em runtime mas nunca persistido | **PRECISA ADICIONAR** |
| `analise_ia_status` | PARCIAL | `ai_pre_calculated` (boolean) existe | Precisa de status mais rico (enum) |

**Acoes necessarias**:
1. Adicionar `valor_presente` (numeric) -- persiste o VP calculado
2. Adicionar `entrada_calculada` (numeric) -- persiste a entrada detectada/calculada pela IA
3. Adicionar `analise_ia_status` (text) -- substitui/complementa o boolean `ai_pre_calculated` com estados mais granulares

---

### 3. RBAC (Cargos e Permissoes) -- Totalmente Implementado

O sistema de RBAC ja esta **100% operacional** com:

**Cargos (enum `app_role`)**:
- `admin` = Gerente (controle total)
- `manager` = Analista (quase tudo, exceto remover membros e configuracoes)
- `seller` = Vendedor (ve apenas suas proprias vendas e comissoes + representantes linkados)
- `representative` = Representante (apenas comissoes proprias)
- `super_admin` = Master do sistema
- `saas_admin` = Admin SaaS

**Infraestrutura existente**:
- Tabela `user_roles` com RLS
- Tabela `user_permissions` para overrides individuais
- Tabela `role_permissions` para templates por cargo
- Funcoes SQL: `has_role()`, `has_permission()`, `can_view_all_sales()`, `get_user_org_id()`
- `usePermissions` hook com 11 permissoes granulares
- RLS policies na tabela `sales` que filtram por cargo (Vendedor ve so o seu, Admin ve tudo)
- `RolePermissionsManager` UI para configurar permissoes por cargo
- `EditRoleDialog` para alterar cargos com validacao hierarquica
- Template padrao via `create_default_role_permissions()`

**Conclusao**: Nenhuma mudanca necessaria no RBAC.

---

## Plano de Implementacao

### Etapa 1: Migration SQL -- Novas colunas na tabela `sales`

Adicionar as 3 colunas que faltam:

```sql
-- Valor Presente calculado (VP das parcelas com taxa de juros)
ALTER TABLE public.sales 
ADD COLUMN valor_presente numeric;

-- Entrada calculada pela IA (diferente de valor_entrada que vem do boleto)
ALTER TABLE public.sales 
ADD COLUMN entrada_calculada numeric;

-- Status granular da analise de IA 
-- Valores: 'pendente', 'processando', 'concluido', 'falha', 'revisado'
ALTER TABLE public.sales 
ADD COLUMN analise_ia_status text DEFAULT 'pendente';
```

Os valores de `analise_ia_status`:
- `pendente` -- aguardando analise (venda acabou de chegar)
- `processando` -- IA esta analisando
- `concluido` -- IA finalizou com sucesso (match FIPE + calculos)
- `falha` -- IA tentou mas falhou (sem match FIPE, erro, etc.)
- `revisado` -- humano revisou e aprovou os calculos da IA

### Etapa 2: Atualizar Edge Function `parse-nfe-xml`

Quando a funcao faz o pre-calculo automatico (logica adicionada na implementacao anterior), gravar tambem:
- `valor_presente` com o VP calculado
- `entrada_calculada` com o valor da entrada detectada
- `analise_ia_status = 'concluido'` em vez de apenas `ai_pre_calculated = true`
- Se falhar o match FIPE: `analise_ia_status = 'falha'`

### Etapa 3: Atualizar hooks e componentes

- `usePendingSales.ts` -- incluir `valor_presente`, `entrada_calculada`, `analise_ia_status` no select
- `useEditableSale.ts` -- incluir os novos campos
- `Pendencias.tsx` -- usar `analise_ia_status` para mostrar badges mais informativos (Calculado, Falha, Revisado)
- `CommissionCalculator.tsx` -- persistir `valor_presente` ao salvar
- `SalesApproval.tsx` -- ao aprovar, atualizar `analise_ia_status` para 'revisado'

### Etapa 4: Atualizar tipo TypeScript (automatico)

O arquivo `types.ts` sera regenerado automaticamente apos a migration.

---

## Resumo das Mudancas

| Categoria | O que muda | O que ja existe (sem alteracao) |
|---|---|---|
| Organizations | Nada -- campos ja existem | `comissao_base`, `comissao_over_percent`, `ai_api_key` |
| Sales (schema) | +3 colunas: `valor_presente`, `entrada_calculada`, `analise_ia_status` | `produto_marca`, `produto_modelo`, `produto_numero_serie`, `ai_pre_calculated` |
| RBAC | Nada -- sistema completo | 4 cargos, 11 permissoes, RLS, funcoes SQL, UI |
| Edge Function | Gravar novos campos no pre-calculo | Logica de match FIPE e calculo |
| Frontend | Badges mais ricos + persistencia do VP | Calculadora, lista de pendencias, aprovacao |

---

## Secao Tecnica

### Arquivos afetados:
1. **Migration SQL** -- adicionar 3 colunas em `sales`
2. **`supabase/functions/parse-nfe-xml/index.ts`** -- gravar `valor_presente`, `entrada_calculada`, `analise_ia_status`
3. **`src/hooks/usePendingSales.ts`** -- incluir novos campos no select
4. **`src/hooks/useEditableSale.ts`** -- incluir novos campos
5. **`src/pages/Pendencias.tsx`** -- badges baseados em `analise_ia_status`
6. **`src/components/approval/CommissionCalculator.tsx`** -- persistir `valor_presente`
7. **`src/pages/SalesApproval.tsx`** -- atualizar `analise_ia_status = 'revisado'` ao aprovar

### Compatibilidade:
- A coluna `ai_pre_calculated` (boolean) sera mantida para nao quebrar nada existente. O `analise_ia_status` e um complemento mais rico.
- Vendas existentes receberao `analise_ia_status = 'pendente'` por default, sem impacto.

