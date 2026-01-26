

## Plano: Corrigir Mapeamento de Cargos no ProfileHero

### Problema Identificado

| Banco de Dados | Exibido Atualmente | Deveria Exibir |
|----------------|-------------------|----------------|
| `manager`      | "Gerente" ❌       | "Auxiliar" ✓   |
| `admin`        | "Administrador" ❌ | "Gerente" ✓    |

O perfil da Lidiane está armazenado corretamente como `manager` no banco, mas o frontend está exibindo "Gerente" em vez de "Auxiliar".

---

### Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/profile/ProfileHero.tsx` | Linhas 13-19: Corrigir mapeamento de roles |

---

### Mudança de Código

**De (linhas 12-21):**
```typescript
const getRoleLabel = (role: string) => {
  const labels: Record<string, string> = {
    super_admin: 'Super Administrador',
    admin: 'Administrador',
    manager: 'Gerente',
    seller: 'Vendedor',
    representative: 'Representante',
  };
  return labels[role] || role;
};
```

**Para:**
```typescript
const getRoleLabel = (role: string) => {
  const labels: Record<string, string> = {
    super_admin: 'Super Administrador',
    admin: 'Gerente',
    manager: 'Auxiliar',
    seller: 'Vendedor',
    representative: 'Representante',
  };
  return labels[role] || role;
};
```

---

### Resultado Esperado

- Lidiane (cargo `manager`) será exibida como **"Auxiliar"** no perfil
- Usuários com cargo `admin` serão exibidos como **"Gerente"**
- Alinhamento com a nomenclatura padrão do sistema

