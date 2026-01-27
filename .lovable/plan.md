
# Plano: Expansão da Página de Configurações da Empresa

## Resumo
Expandir a página de Configurações > Empresa para incluir informações cadastrais completas da organização e uma nova seção de "Parametrização" para definir como as comissões são calculadas.

---

## 1. Alteração no Banco de Dados

### Novos campos na tabela `organizations`:

**Dados Cadastrais:**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `cnpj` | text | CNPJ da empresa |
| `razao_social` | text | Razão social completa |
| `endereco` | text | Endereço completo |
| `cidade` | text | Cidade |
| `estado` | text | UF (2 caracteres) |
| `cep` | text | CEP |
| `telefone` | text | Telefone principal |
| `email_contato` | text | Email de contato |

**Parametrização de Comissões:**
| Campo | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `comissao_base` | text | 'valor_tabela' | Base do cálculo: `'valor_tabela'` (sobre o valor de tabela) ou `'comissao_empresa'` (sobre a comissão da empresa) |
| `comissao_over_percent` | numeric | 10 | Percentual do over líquido que o vendedor recebe (padrão 10%) |

---

## 2. Estrutura Visual da Página

```text
┌─────────────────────────────────────────────────────────────────┐
│  [🏢]  Dados da Empresa                                        │
│        Informações cadastrais da sua organização               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │ Nome Fantasia   │  │ Razão Social    │                      │
│  │ [Supravel     ] │  │ [Panama Log... ]│                      │
│  └─────────────────┘  └─────────────────┘                      │
│                                                                 │
│  ┌─────────────────┐  ┌──────────┐                             │
│  │ CNPJ            │  │ UF       │                             │
│  │ [21.258.654/...]│  │ [SC    ] │                             │
│  └─────────────────┘  └──────────┘                             │
│                                                                 │
│  ┌─────────────────────────────────────┐                       │
│  │ Endereço                            │                       │
│  │ [Rua Example, 123 - Centro        ] │                       │
│  └─────────────────────────────────────┘                       │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Cidade      │  │ CEP         │  │ Telefone    │            │
│  │ [Joinville ]│  │ [89000-000 ]│  │ [(47) 3422.]│            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│  ┌─────────────────────────────────────┐                       │
│  │ Email de Contato                    │                       │
│  │ [contato@empresa.com.br           ] │                       │
│  └─────────────────────────────────────┘                       │
│                                                                 │
│                                       [Salvar Alterações]       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  [⚙️]  Parametrização                                          │
│        Configure as regras de comissão da empresa               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ── Comissão Base ──────────────────────────────────────────── │
│  Defina sobre qual valor a comissão do vendedor será calculada │
│                                                                 │
│  ○ Sobre o Valor de Tabela                                     │
│    Ex: Se valor tabela = R$ 20.000 e % = 8%, comissão = R$ 1.600│
│                                                                 │
│  ○ Sobre a Comissão da Empresa                                 │
│    Ex: Se comissão empresa = R$ 2.500 e % = 8%, com. = R$ 200  │
│                                                                 │
│  ── Comissão do Over ───────────────────────────────────────── │
│  Percentual do Over Líquido que o vendedor recebe              │
│                                                                 │
│  ┌──────────────────────────────────┐                          │
│  │ Percentual do Over (%)           │                          │
│  │ [10,00                        ]% │                          │
│  └──────────────────────────────────┘                          │
│                                                                 │
│  ℹ️ Quando o vendedor é atribuído a uma venda, ele recebe      │
│     este percentual sobre o Over Líquido (após impostos).      │
│                                                                 │
│                                       [Salvar Parametrização]   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Arquivos a Modificar/Criar

### 3.1 Migração de Banco de Dados
Adicionar novas colunas na tabela `organizations`:

```sql
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS cnpj text,
ADD COLUMN IF NOT EXISTS razao_social text,
ADD COLUMN IF NOT EXISTS endereco text,
ADD COLUMN IF NOT EXISTS cidade text,
ADD COLUMN IF NOT EXISTS estado text,
ADD COLUMN IF NOT EXISTS cep text,
ADD COLUMN IF NOT EXISTS telefone text,
ADD COLUMN IF NOT EXISTS email_contato text,
ADD COLUMN IF NOT EXISTS comissao_base text DEFAULT 'valor_tabela',
ADD COLUMN IF NOT EXISTS comissao_over_percent numeric DEFAULT 10;
```

### 3.2 Frontend - Página de Configurações
**Arquivo: `src/pages/settings/OrganizationSettings.tsx`**

Expandir para incluir:
- Formulário editável com todos os campos cadastrais
- Seção separada de "Parametrização" com:
  - Radio buttons para escolher a base da comissão
  - Input numérico para o percentual do over
- Botões de salvar independentes para cada seção
- Feedback visual de salvamento (loading states, toasts)

### 3.3 Hook de Dados
**Arquivo: `src/hooks/useOrganizationSettings.ts`** (existente)

Atualizar a interface para incluir novos campos:

```typescript
export interface OrganizationSettings {
  // Campos IMAP existentes...
  
  // Novos campos cadastrais
  cnpj: string;
  razao_social: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone: string;
  email_contato: string;
  
  // Parametrização de comissões
  comissao_base: 'valor_tabela' | 'comissao_empresa';
  comissao_over_percent: number;
}
```

---

## 4. Integração com Cálculo de Comissão

Após implementar a parametrização, o cálculo em `CommissionCalculator.tsx` deverá:

1. **Buscar configurações da organização** ao carregar
2. **Usar `comissao_over_percent`** (da parametrização) ao invés do 10% fixo atual
3. **Aplicar a lógica de `comissao_base`** para determinar sobre qual valor calcular o percentual do vendedor

---

## Detalhes Técnicos

### Validações de Input
- **CNPJ**: Máscara `XX.XXX.XXX/XXXX-XX` com validação de formato
- **Telefone**: Máscara `(XX) XXXXX-XXXX`
- **CEP**: Máscara `XXXXX-XXX`
- **Estado**: Dropdown com UFs brasileiras
- **Percentual Over**: Min 0, Max 100, permitir decimais

### Permissões
- Apenas usuários com role `admin` ou `manager` podem editar configurações
- A política RLS existente já cobre UPDATE para admins/managers

### UX/UI
- Campos organizados em grid responsivo (2 colunas em desktop, 1 em mobile)
- Loading skeleton enquanto carrega dados
- Indicador visual de campos não salvos
- Confirmação de salvamento com toast

---

## Ordem de Implementação

1. **Migração SQL** - Adicionar colunas no banco
2. **Atualizar hook** - Incluir novos campos em `useOrganizationSettings`
3. **Expandir página** - Reformular `OrganizationSettings.tsx` com formulários
4. **Validações** - Adicionar máscaras e validações de input
5. **Integrar com calculadora** - Usar parametrização no `CommissionCalculator`
