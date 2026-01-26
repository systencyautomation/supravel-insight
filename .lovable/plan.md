

## Plano: Edição e Criação de Acesso para Representantes

### Objetivo
Adicionar duas funcionalidades ao sistema de representantes externos:
1. **Editar informações** do representante (nome, email, telefone, sede, empresa, posição)
2. **Criar acesso** ao sistema, transformando-o em usuário com role `representative`

### Fluxo Visual

```text
┌──────────────────────────────────────────────────────────────┐
│ João Silva          [Representante] [Ativo]                  │
│ 📧 joao@email.com  📞 (11) 99999                             │
│ 🏢 Empresa ABC  📍 São Paulo                       [⋮]      │
└──────────────────────────────────────────────────────────────┘
                                                      │
                                                      ▼
                                        ┌─────────────────────┐
                                        │ ✏️ Editar           │
                                        │ 🔑 Criar Acesso     │
                                        │ ────────────────    │
                                        │ ✓/✗ Ativar/Desativar│
                                        │ 🗑️ Excluir          │
                                        └─────────────────────┘
```

### Funcionalidade 1: Editar Representante

#### Novo Componente: `EditRepresentativeDialog.tsx`

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Nome | Input | Sim |
| Email | Input | Não |
| Telefone | Input | Não |
| Sede | Input | Não |
| Empresa | Input | Não |
| Posição | Select | Sim |

O dialog será similar ao `AddRepresentativeDialog`, mas carregará os dados existentes e chamará `updateRepresentative()` ao salvar.

### Funcionalidade 2: Criar Acesso

#### Novo Componente: `CreateAccessDialog.tsx`

Quando o admin clicar em "Criar Acesso":
1. Abre um dialog solicitando apenas a **senha** (email já existe no cadastro)
2. Chama a edge function `create-member-direct` com role `representative`
3. Atualiza o campo `user_id` na tabela `representatives` para vincular ao usuário criado
4. O representante passa a ter o badge "Com acesso" na lista

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| Email | Pré-preenchido | Mostra o email cadastrado (read-only) |
| Senha | Sim | Mínimo 6 caracteres |
| Confirmar Senha | Sim | Deve coincidir |

#### Modificação na Edge Function

A edge function `create-member-direct` precisa aceitar um parâmetro opcional `representativeId` para vincular o usuário criado ao registro na tabela `representatives`.

### Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/team/EditRepresentativeDialog.tsx` | Criar | Dialog para editar dados |
| `src/components/team/CreateAccessDialog.tsx` | Criar | Dialog para criar login |
| `src/components/team/RepresentativesList.tsx` | Modificar | Adicionar itens no dropdown menu |
| `src/hooks/useRepresentatives.ts` | Modificar | Adicionar função para vincular user_id |
| `supabase/functions/create-member-direct/index.ts` | Modificar | Aceitar `representativeId` opcional |

### Detalhes Técnicos

#### Estrutura do EditRepresentativeDialog

```text
┌─────────────────────────────────────┐
│  Editar Representante               │
├─────────────────────────────────────┤
│  Nome *         [João Silva      ]  │
│  Email          [joao@email.com  ]  │
│  Telefone       [(11) 99999-0000 ]  │
│  Sede           [São Paulo       ]  │
│  Empresa        [Empresa ABC     ]  │
│  Posição *      [▼ Representante ]  │
├─────────────────────────────────────┤
│          [Cancelar]  [Salvar]       │
└─────────────────────────────────────┘
```

#### Estrutura do CreateAccessDialog

```text
┌─────────────────────────────────────┐
│  Criar Acesso ao Sistema            │
├─────────────────────────────────────┤
│  ℹ️ João Silva terá acesso ao       │
│  sistema com permissões padrão de   │
│  representante.                     │
│                                     │
│  Email          [joao@email.com]🔒  │
│  Senha *        [________________]  │
│  Confirmar *    [________________]  │
├─────────────────────────────────────┤
│          [Cancelar]  [Criar Acesso] │
└─────────────────────────────────────┘
```

#### Fluxo de Criação de Acesso

```text
1. Admin clica "Criar Acesso"
      │
      ▼
2. Dialog abre com email pré-preenchido
      │
      ▼
3. Admin define senha
      │
      ▼
4. Chama edge function create-member-direct
   {
     email: "joao@email.com",
     password: "******",
     fullName: "João Silva",
     role: "representative",
     organizationId: "...",
     representativeId: "..."  ← novo parâmetro
   }
      │
      ▼
5. Edge function:
   - Cria usuário no Auth
   - Insere user_roles
   - Insere user_permissions padrão
   - Atualiza representatives.user_id  ← novo passo
      │
      ▼
6. UI atualiza, mostra badge "Com acesso"
```

### Validações

**Para Criar Acesso:**
- O representante precisa ter email cadastrado (mostrar erro se não tiver)
- Se já tiver `user_id`, o botão "Criar Acesso" fica desabilitado ou não aparece

**Para Edição:**
- Se o representante já tem acesso (`user_id` existe), o campo email fica read-only para evitar inconsistências

### Permissões

Ambas as funcionalidades seguem a mesma lógica já existente:
- Gerentes (admin) e Auxiliares (manager) podem editar e criar acesso
- A edge function já valida essas permissões

### Observação sobre Indicador vs Representante

Conforme solicitado, tanto "indicador" quanto "representante" receberão as mesmas permissões padrão do role `representative`. A diferença é apenas para categorização interna, não afetando o nível de acesso ao sistema.

