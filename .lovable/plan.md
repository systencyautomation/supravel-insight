

## Plano: Corrigir Mapeamento de Cargos no Email de Convite

### Problema Identificado

Na Edge Function `send-member-invitation`, o mapeamento de roles está **invertido**:

| Role no DB | Exibido no Email | Deveria Exibir |
|------------|------------------|----------------|
| `manager`  | "Gerente" ❌     | "Auxiliar" ✓   |
| `admin`    | (não mapeado)    | "Gerente" ✓    |

### Código Atual (Linha 37-41)

```typescript
const roleLabels: Record<string, string> = {
  manager: "Gerente",       // ❌ Invertido
  seller: "Vendedor",
  representative: "Representante",
};
```

### Código Corrigido

```typescript
const roleLabels: Record<string, string> = {
  admin: "Gerente",         // ✓ Corrigido
  manager: "Auxiliar",      // ✓ Corrigido  
  seller: "Vendedor",
  representative: "Representante",
};
```

### Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/send-member-invitation/index.ts` | Linhas 37-41: Corrigir mapeamento de roles |

### Observação

Este é o mesmo padrão de nomenclatura usado no frontend (`InviteMemberDialog.tsx` linha 29-34), que já está correto. A Edge Function precisa ser alinhada com essa nomenclatura.

