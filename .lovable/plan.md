

## Plano: Reestruturar Cadastro de Representantes Externos para Empresas

### Visão Geral

Transformar o cadastro de "representantes externos" para focar em **Empresas** ao invés de pessoas. Cada empresa terá:
- **Responsável direto** (obrigatório)
- **Funcionários** (opcional, apenas nome e telefone)
- **Tag "Técnico"** disponível para empresa, responsável e funcionários

### Estrutura de Dados

```text
┌─────────────────────────────────────────────────┐
│ EMPRESA (MEI ou CNPJ)                           │
│ - Nome da empresa                               │
│ - CNPJ (opcional)                               │
│ - Tipo: MEI / Empresa                           │
│ - Sede/Cidade                                   │
│ - Position: indicador / representante          │
│ - Tag: técnico (sim/não)                       │
├─────────────────────────────────────────────────┤
│ RESPONSÁVEL (obrigatório)                       │
│ - Nome                                          │
│ - Telefone                                      │
│ - Email (opcional)                              │
│ - Tag: técnico (sim/não)                       │
├─────────────────────────────────────────────────┤
│ FUNCIONÁRIOS (opcional, apenas se não for MEI) │
│ - Nome                                          │
│ - Telefone                                      │
│ - Tag: técnico (sim/não)                       │
└─────────────────────────────────────────────────┘
```

---

### Mudanças no Banco de Dados

#### 1. Criar nova tabela `representative_companies`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Chave primária |
| organization_id | uuid | FK para organização |
| name | text | Nome da empresa |
| cnpj | text | CNPJ (opcional) |
| company_type | enum | 'mei' ou 'empresa' |
| sede | text | Cidade/sede |
| position | enum | 'indicador' ou 'representante' |
| is_technical | boolean | Tag de técnico |
| active | boolean | Ativo/inativo |
| created_at | timestamp | Data de criação |

#### 2. Criar nova tabela `company_members`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Chave primária |
| company_id | uuid | FK para representative_companies |
| name | text | Nome da pessoa |
| phone | text | Telefone |
| email | text | Email (opcional, só para responsável) |
| role | enum | 'responsavel' ou 'funcionario' |
| is_technical | boolean | Tag de técnico |
| user_id | uuid | FK para auth.users (acesso ao sistema) |
| created_at | timestamp | Data de criação |

#### 3. Migrar dados existentes
- Mover dados da tabela `representatives` para as novas tabelas
- Manter tabela antiga para compatibilidade com vendas existentes

---

### Interface Visual

#### Lista Principal (Expandível)

```text
┌─────────────────────────────────────────────────────────────┐
│ Representantes Externos                        [+ Adicionar] │
├─────────────────────────────────────────────────────────────┤
│ ▼ Patromak                    [Indicador] [Técnico]    ⋮   │
│   └ Domingos (responsável)    📞 51 99396-9897  [Técnico]  │
│   └ João Silva                📞 51 99999-0000             │
│   └ Maria Santos              📞 51 88888-0000  [Técnico]  │
├─────────────────────────────────────────────────────────────┤
│ ▶ MEI - Antônio Marcos        [Indicador]              ⋮   │
│   (Empresa de pessoa única - responsável = empresa)        │
├─────────────────────────────────────────────────────────────┤
│ ▶ Fortumac                    [Representante]          ⋮   │
└─────────────────────────────────────────────────────────────┘
```

#### Dialog de Cadastro

**Passo 1 - Dados da Empresa:**
```text
┌─────────────────────────────────────────────────┐
│ Cadastrar Empresa                           X   │
├─────────────────────────────────────────────────┤
│ Tipo de Empresa *                               │
│ ( ) MEI - Pessoa única                          │
│ (•) Empresa - Com funcionários                  │
│                                                 │
│ Nome da Empresa *         [________________]    │
│ CNPJ (opcional)           [________________]    │
│ Sede/Cidade               [________________]    │
│                                                 │
│ Posição *                                       │
│ [▼ Representante                          ]     │
│                                                 │
│ [✓] Empresa presta serviços técnicos           │
├─────────────────────────────────────────────────┤
│ RESPONSÁVEL                                     │
│                                                 │
│ Nome *                    [________________]    │
│ Telefone *                [________________]    │
│ Email (opcional)          [________________]    │
│                                                 │
│ [✓] É técnico                                  │
├─────────────────────────────────────────────────┤
│                     [Cancelar]  [Cadastrar]     │
└─────────────────────────────────────────────────┘
```

**Para MEI:** O nome do responsável e da empresa serão o mesmo campo (simplificado)

---

### Arquivos a Modificar/Criar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| **Banco de dados** | | |
| Migração SQL | Criar | Novas tabelas e enum |
| **Hooks** | | |
| `src/hooks/useRepresentativeCompanies.ts` | Criar | CRUD de empresas |
| `src/hooks/useCompanyMembers.ts` | Criar | CRUD de membros |
| **Componentes** | | |
| `src/components/team/AddCompanyDialog.tsx` | Criar | Dialog de cadastro de empresa |
| `src/components/team/EditCompanyDialog.tsx` | Criar | Dialog de edição de empresa |
| `src/components/team/CompaniesList.tsx` | Criar | Lista expandível de empresas |
| `src/components/team/AddMemberDialog.tsx` | Criar | Dialog para adicionar funcionário |
| `src/components/team/CompanyMemberRow.tsx` | Criar | Linha de membro na lista expandida |
| **Páginas** | | |
| `src/pages/settings/TeamSettings.tsx` | Modificar | Usar nova estrutura de empresas |

---

### Fluxo de Cadastro

```text
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Clica Adicionar │ ──▶ │  Escolhe Tipo    │ ──▶ │  Preenche Form   │
│                  │     │  MEI ou Empresa  │     │  + Responsável   │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                                           │
                                                           ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Adicionar       │ ◀── │  Expandir Card   │ ◀── │  Empresa Criada  │
│  Funcionários    │     │  na Lista        │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

---

### Detalhes Técnicos

#### Novo Enum
```sql
CREATE TYPE company_type AS ENUM ('mei', 'empresa');
CREATE TYPE member_role AS ENUM ('responsavel', 'funcionario');
```

#### RLS Policies
As políticas seguirão o mesmo padrão da tabela `representatives`:
- Admins/Managers podem gerenciar
- Usuários da organização podem visualizar

#### Migração de Dados
Script para converter registros existentes:
1. Cada `representative` atual vira uma empresa tipo 'mei'
2. O `name` atual vira o nome da empresa E o nome do responsável
3. Os campos `phone`, `email` vão para o responsável
4. O campo `company` antigo migra para o nome da empresa

---

### Resultado Esperado

1. **Cadastro focado em Empresa** - Não mais em pessoa individual
2. **MEI simplificado** - Empresa = Responsável (mesma pessoa)
3. **Empresa com funcionários** - Responsável obrigatório + funcionários opcionais
4. **Tag Técnico** - Disponível para empresa, responsável e funcionários
5. **Lista expandível** - Clicar na empresa mostra responsável e funcionários
6. **Retrocompatibilidade** - Vendas existentes continuam funcionando

