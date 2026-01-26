

## Plano: Expandir Campos do Cadastro de Representantes

### Objetivo
Adicionar os campos **Sede**, **Empresa** e **Posição** ao formulário e tabela de representantes, permitindo um cadastro mais completo.

### Novos Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `sede` | TEXT | Localização/filial do representante |
| `company` | TEXT | Empresa que o representante representa |
| `position` | ENUM | Tipo: 'indicador' ou 'representante' |

### Alterações Necessárias

#### 1. Migração do Banco de Dados
```sql
-- Criar enum para posição
CREATE TYPE public.representative_position AS ENUM ('indicador', 'representante');

-- Adicionar novos campos
ALTER TABLE public.representatives 
  ADD COLUMN sede TEXT,
  ADD COLUMN company TEXT,
  ADD COLUMN position representative_position DEFAULT 'representante';
```

#### 2. Atualizar Hook `useRepresentatives.ts`
- Adicionar `sede`, `company` e `position` na interface `Representative`
- Adicionar campos em `CreateRepresentativeData`
- Incluir novos campos nas operações de insert

#### 3. Atualizar Dialog `AddRepresentativeDialog.tsx`
- Adicionar campos no schema Zod:
  - `sede` (opcional)
  - `company` (opcional)
  - `position` (obrigatório, com select)
- Adicionar inputs no formulário:
  - Input para Sede
  - Input para Empresa
  - Select para Posição (Indicador / Representante)

#### 4. Atualizar Lista `RepresentativesList.tsx`
- Exibir badge com a posição (Indicador/Representante)
- Mostrar empresa e sede quando disponíveis

### Layout do Formulário Atualizado

```text
┌─────────────────────────────────────┐
│  Adicionar Representante            │
├─────────────────────────────────────┤
│  Nome *         [________________]  │
│  E-mail         [________________]  │
│  Telefone       [________________]  │
│  Sede           [________________]  │
│  Empresa        [________________]  │
│  Posição *      [▼ Representante ]  │
│                  ├─ Indicador       │
│                  └─ Representante   │
├─────────────────────────────────────┤
│          [Cancelar]  [Cadastrar]    │
└─────────────────────────────────────┘
```

### Exibição na Lista

```text
┌──────────────────────────────────────────────┐
│ João Silva          [Representante] [Ativo]  │
│ 📧 joao@email.com  📞 (11) 99999             │
│ 🏢 Empresa ABC  📍 São Paulo                 │
└──────────────────────────────────────────────┘
```

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | Adicionar colunas `sede`, `company`, `position` |
| `src/hooks/useRepresentatives.ts` | Expandir interfaces e operações |
| `src/components/team/AddRepresentativeDialog.tsx` | Adicionar novos campos ao form |
| `src/components/team/RepresentativesList.tsx` | Exibir novos dados na lista |

### Observação sobre CPF
O campo `document` (CPF) será **removido do formulário** conforme solicitado, mantendo apenas: Nome, E-mail, Telefone, Sede, Empresa e Posição.

