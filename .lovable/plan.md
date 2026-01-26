

## Plano: Simplificar Formulário de Cadastro de Empresas

### O que será removido

| Campo | Motivo |
|-------|--------|
| Tipo de Empresa (MEI/CNPJ) | Não necessário - todos são tratados igual |
| Telefone do responsável | Não solicitado |
| Sede/Cidade | Não solicitado |

### Campos finais do formulário

**Dados da Empresa:**
1. Nome da Empresa *
2. CNPJ (opcional)
3. Posição * (Indicador/Representante)
4. Empresa técnica (checkbox)

**Dados do Responsável:**
5. Nome *
6. E-mail (opcional)
7. É técnico (checkbox)

---

### Visualização do novo formulário

```text
┌─────────────────────────────────────────────────┐
│ Cadastrar Empresa                           X   │
├─────────────────────────────────────────────────┤
│ Nome da Empresa *         [________________]    │
│                                                 │
│ CNPJ (opcional)           [________________]    │
│                                                 │
│ Posição *                                       │
│ [▼ Representante                          ]     │
│                                                 │
│ [✓] Empresa presta serviços técnicos           │
├─────────────────────────────────────────────────┤
│ RESPONSÁVEL                                     │
│                                                 │
│ Nome *                    [________________]    │
│                                                 │
│ Email (opcional)          [________________]    │
│                                                 │
│ [✓] É técnico                                  │
├─────────────────────────────────────────────────┤
│                     [Cancelar]  [Cadastrar]     │
└─────────────────────────────────────────────────┘
```

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/team/AddCompanyDialog.tsx` | Remover campos: company_type, sede, responsavel_phone |
| `src/components/team/EditCompanyDialog.tsx` | Remover campos: sede, responsavelPhone; remover lógica MEI |
| `src/components/team/CompaniesList.tsx` | Remover exibição de sede e telefone; remover lógica MEI |

---

### Detalhes Técnicos

#### AddCompanyDialog.tsx

**Schema simplificado:**
```typescript
const formSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cnpj: z.string().optional(),
  position: z.enum(['indicador', 'representante'] as const),
  is_technical: z.boolean().default(false),
  responsavel_name: z.string().min(2, 'Nome do responsável é obrigatório'),
  responsavel_email: z.string().email('Email inválido').optional().or(z.literal('')),
  responsavel_is_technical: z.boolean().default(false),
});
```

**Remover:**
- Campo `company_type` (radio MEI/Empresa)
- Campo `sede`
- Campo `responsavel_phone`
- Lógica `isMei` para nome da empresa

#### EditCompanyDialog.tsx

**Remover:**
- Estado `sede` e campo relacionado
- Estado `responsavelPhone` e campo relacionado
- Referências a `isMei` e `company.company_type`
- Título dinâmico MEI/Empresa (usar sempre "Empresa")

#### CompaniesList.tsx

**Remover:**
- Badge "MEI" 
- Exibição de `company.sede`
- Exibição do telefone do responsável
- Referências a `isMei`

**Nova visualização do card:**
```text
┌────────────────────────────────────────────────────────────────┐
│ ▶ GCO Parts                              [Indicador] [Técnico] ⋮│
│   Odacir Franco                                                │
├────────────────────────────────────────────────────────────────┤
│ ▶ Patromak                               [Indicador]          ⋮│
│   Domingos [técnico]                                           │
└────────────────────────────────────────────────────────────────┘
```

---

### Resultado Esperado

1. Formulário simplificado com apenas 7 campos
2. Sem distinção MEI/Empresa na interface
3. Lista mais limpa sem telefone e sede
4. Edição também simplificada com mesmos campos

