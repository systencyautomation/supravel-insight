

## Plano: Cadastro de Representantes sem Acesso (Pré-cadastro)

### Contexto do Problema

Atualmente, para ter um representante no sistema você precisa:
1. Criar um usuário com login via "Adicionar Membro"
2. Isso envia email ou cria credenciais de acesso

Você quer cadastrar ~30 representantes apenas para fins de **registro interno**, sem que eles tenham acesso ao sistema por enquanto.

### Solução Proposta

Criar uma nova tabela `representatives` para armazenar representantes externos que:
- Não têm login no sistema
- Podem ser vinculados às vendas para cálculo de comissões
- Futuramente podem ser "ativados" com um usuário de acesso

### Estrutura do Banco de Dados

```text
+-------------------+
|  representatives  |
+-------------------+
| id (uuid)         |
| organization_id   |
| name              |
| email (opcional)  |
| phone (opcional)  |
| document (CPF)    |
| active            |
| user_id (null)    |  <- quando ativar, vincula ao usuário
| created_at        |
+-------------------+
```

### Funcionalidades a Implementar

1. **Nova Seção em Team Settings**
   - Card "Representantes Externos" separado dos membros ativos
   - Lista de representantes cadastrados
   - Botão "Adicionar Representante"

2. **Dialog de Cadastro Simples**
   - Campos: Nome, Email (opcional), Telefone (opcional), CPF (opcional)
   - Sem necessidade de senha ou convite
   - Salva direto na tabela `representatives`

3. **Vinculação às Vendas**
   - O campo `representative_id` nas vendas passa a referenciar esta tabela
   - Dropdown para selecionar representante ao aprovar vendas

4. **Ativação Futura**
   - Botão "Fornecer Acesso" em cada representante
   - Cria usuário + vincula o `user_id` na tabela `representatives`
   - O representante passa a aparecer também nos "Membros Ativos"

### Fluxo Visual

```text
Configurações > Equipe
├── Membros Ativos (com login)
│   └── Gerentes, Auxiliares, Vendedores...
│
├── Representantes Externos (sem login)
│   ├── João Silva - joao@email.com
│   ├── Maria Santos - (11) 99999-0000
│   └── [+ Adicionar Representante]
│
└── Convites Pendentes
```

### Migração SQL Necessária

```sql
-- Tabela para representantes externos
CREATE TABLE public.representatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  document TEXT,
  active BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.representatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view representatives in their org"
ON public.representatives FOR SELECT TO authenticated
USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admins can manage representatives"
ON public.representatives FOR ALL TO authenticated
USING (organization_id = get_user_org_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')))
WITH CHECK (organization_id = get_user_org_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')));
```

### Componentes a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/team/RepresentativesList.tsx` | Lista de representantes externos |
| `src/components/team/AddRepresentativeDialog.tsx` | Dialog para cadastro simples |
| `src/hooks/useRepresentatives.ts` | Hook para CRUD de representantes |

### Benefícios desta Abordagem

- Separação clara entre usuários com acesso e representantes externos
- Cadastro rápido em massa (nome + email opcional)
- Flexibilidade para ativar acesso quando necessário
- Relatórios de comissões podem referenciar estes representantes

### Alternativa Mais Simples

Se preferir uma solução ainda mais rápida, posso apenas criar a tabela e um formulário simples de cadastro, sem a funcionalidade de "ativar acesso" por enquanto. Isso permite cadastrar os 30 representantes imediatamente.

