

## Plano: Corrigir Adição de Membros às Empresas

### Problemas Identificados

1. **Telefone está obrigatório** - O formulário exige telefone com mínimo de 8 caracteres
2. **Botão inacessível** - O botão "Funcionário" só aparece dentro da área expandida, que só abre se já existem funcionários

### Solução

#### Campos do formulário simplificado:
- **Nome** * (obrigatório)
- **Telefone** (opcional)

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/team/AddMemberDialog.tsx` | Tornar telefone opcional, remover checkbox técnico |
| `src/components/team/CompaniesList.tsx` | Mover botão de adicionar membro para o menu da empresa |

---

### Detalhes Técnicos

#### AddMemberDialog.tsx

**Schema atualizado:**
```typescript
const formSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  phone: z.string().optional(),  // Antes: min(8) obrigatório
});
```

**Remover:**
- Campo `is_technical` (checkbox)
- Referências a `is_technical` no submit

**Formulário final:**
- Nome * (input)
- Telefone (input opcional)

#### CompaniesList.tsx

**Adicionar opção no menu dropdown:**
```tsx
<DropdownMenuItem onClick={() => /* abrir dialog adicionar membro */}>
  <Plus className="h-4 w-4 mr-2" />
  Adicionar Membro
</DropdownMenuItem>
```

**Mudança no fluxo:**
1. O `AddMemberDialog` será controlado por estado (não mais pelo Trigger interno)
2. O menu da empresa terá opção "Adicionar Membro" que abre o dialog
3. O botão na área expandida permanece como alternativa

---

### Nova Interface

**Menu da empresa:**
```text
┌─────────────────┐
│ + Adicionar Membro │
│ ✏ Editar         │
│ 🗑 Excluir        │
└─────────────────┘
```

**Formulário de adicionar membro:**
```text
┌─────────────────────────────────────────────────┐
│ Adicionar Membro                            X   │
├─────────────────────────────────────────────────┤
│ Adicione um membro à empresa GCO Parts          │
│                                                 │
│ Nome *              [____________________]      │
│                                                 │
│ Telefone            [____________________]      │
│                     (opcional)                  │
├─────────────────────────────────────────────────┤
│                     [Cancelar]  [Adicionar]     │
└─────────────────────────────────────────────────┘
```

---

### Resultado Esperado

1. **Acesso fácil** - Adicionar membro pelo menu da empresa (sempre acessível)
2. **Formulário simples** - Apenas nome (obrigatório) e telefone (opcional)
3. **Sem bloqueio** - Não precisa ter funcionários para poder adicionar o primeiro

