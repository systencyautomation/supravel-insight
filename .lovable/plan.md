

## Plano: Mostrar Responsável Inline e Adicionar Edição

### Resumo das Mudanças

1. **Manter todos os dados** - Sem exclusão de duplicatas ou MEIs
2. **Mostrar responsável no card** - Para TODAS as empresas (indicadores e representantes)
3. **Adicionar funcionalidade de edição** - Empresas e membros

---

### Nova Interface Visual

O nome e telefone do responsável aparecerão diretamente no card, sem precisar expandir:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ ▶ GCO Parts                                    Sarandi    [Indicador] ⋮│
│   Odacir Franco  •  54 99922-2319                                      │
├────────────────────────────────────────────────────────────────────────┤
│ ▶ Patromak                                     Lajeado    [Indicador] ⋮│
│   Domingos [técnico]  •  51 99396-9897                                 │
├────────────────────────────────────────────────────────────────────────┤
│ ▶ Fortumac                                                [Representante] ⋮│
│   João Silva  •  51 99999-0000                                         │
├────────────────────────────────────────────────────────────────────────┤
│ ▶ MEI (João Carlos)                            Pinheiro   [Indicador] ⋮│
│   51 98158-4983                                  Machado               │
└────────────────────────────────────────────────────────────────────────┘
```

**Legenda:**
- Linha 1: Nome da empresa + badges (MEI, Indicador/Representante, Técnico) + Sede + Menu
- Linha 2: Nome do responsável + badge técnico (se aplicável) + telefone
- A seta de expansão só aparece se houver funcionários além do responsável

---

### Arquivos a Modificar/Criar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/team/CompaniesList.tsx` | Modificar | Mostrar responsável inline no card |
| `src/components/team/EditCompanyDialog.tsx` | Criar | Dialog para editar empresa + responsável |
| `src/components/team/EditMemberDialog.tsx` | Criar | Dialog para editar funcionário |
| `src/components/team/CompanyMemberRow.tsx` | Modificar | Adicionar botão de edição |
| `src/hooks/useRepresentativeCompanies.ts` | Modificar | Adicionar função updateCompany |

---

### Detalhes Técnicos

#### 1. CompaniesList.tsx - Mudanças

**Estrutura do card atualizada:**

```tsx
<div className="border rounded-lg overflow-hidden">
  {/* Header sempre visível */}
  <div className="flex flex-col p-4 hover:bg-muted/50">
    {/* Linha 1: Empresa + badges + sede + menu */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {funcionarios.length > 0 ? <ChevronIcon /> : <div className="w-6" />}
        <Building2 />
        <span className="font-medium">{company.name}</span>
        <Badge>MEI</Badge>
        <Badge>Indicador/Representante</Badge>
        {company.is_technical && <Badge>Técnico</Badge>}
      </div>
      <div className="flex items-center gap-2">
        <span>{company.sede}</span>
        <DropdownMenu />
      </div>
    </div>
    
    {/* Linha 2: Responsável (sempre visível) */}
    <div className="flex items-center gap-2 ml-9 mt-1 text-sm text-muted-foreground">
      <span>{responsavel?.name}</span>
      {responsavel?.is_technical && <Badge size="sm">técnico</Badge>}
      <span>•</span>
      <Phone className="h-3 w-3" />
      <span>{responsavel?.phone}</span>
    </div>
  </div>
  
  {/* Conteúdo expandível (só funcionários) */}
  <CollapsibleContent>
    {funcionarios.map(f => <CompanyMemberRow />)}
    <AddMemberDialog />
  </CollapsibleContent>
</div>
```

**Lógica de expansão:**
- Se `funcionarios.length === 0`, não mostrar seta de expansão
- O responsável NÃO aparece mais na área expandida (já está no card)

#### 2. EditCompanyDialog.tsx - Novo Componente

```tsx
interface EditCompanyDialogProps {
  company: RepresentativeCompany;
  responsavel: CompanyMember | undefined;
  onSave: (companyData, responsavelData) => Promise<boolean>;
}
```

**Campos editáveis:**
- **Empresa:**
  - Nome
  - CNPJ (opcional)
  - Sede/Cidade
  - Posição (Indicador/Representante)
  - Tag Técnico

- **Responsável:**
  - Nome
  - Telefone
  - Email (opcional)
  - Tag Técnico

#### 3. EditMemberDialog.tsx - Novo Componente

```tsx
interface EditMemberDialogProps {
  member: CompanyMember;
  onSave: (data) => Promise<boolean>;
}
```

**Campos editáveis:**
- Nome
- Telefone
- Tag Técnico

#### 4. Hook useRepresentativeCompanies.ts - Adicionar updateCompany

```tsx
const updateCompany = async (id: string, data: Partial<CreateCompanyData>) => {
  const { error } = await supabase
    .from('representative_companies')
    .update(data)
    .eq('id', id);
  // ... tratamento de erro e atualização do estado
};
```

---

### Fluxo de Edição

**Para editar empresa:**
1. Usuário clica no menu (⋮) do card
2. Seleciona "Editar"
3. Abre EditCompanyDialog com dados da empresa e responsável
4. Usuário altera campos desejados
5. Clica em "Salvar"
6. Sistema atualiza empresa e responsável no banco

**Para editar funcionário:**
1. Usuário expande o card da empresa
2. Clica no menu (⋮) do funcionário
3. Seleciona "Editar"
4. Abre EditMemberDialog com dados do funcionário
5. Usuário altera campos desejados
6. Clica em "Salvar"

---

### Resultado Esperado

1. **Responsável visível** - Nome e telefone aparecem direto no card para todas as empresas
2. **Interface limpa** - Expansão só mostra funcionários (responsável já está no card)
3. **Edição completa** - Poder editar empresa, responsável e funcionários
4. **Consistência** - Mesmo layout para MEI, representantes e indicadores

