

## Plano: Corrigir Navegação do Master Admin nas Configurações

### Problema Identificado

O Master Admin está sendo redirecionado incorretamente para `/settings/profile` ao navegar pela aplicação porque:

1. O botão "Voltar" no `SettingsSidebar.tsx` sempre navega para `/`
2. A página `Index.tsx` tenta redirecionar Master Admin para `/master`, mas há uma condição de corrida
3. O estado `isMasterAdmin` pode não estar carregado no momento do redirecionamento

### Solução

Modificar o botão "Voltar" para ser **contextual**:
- Se for **Master Admin sem organização impersonada**: navegar para `/master`
- Se for **usuário normal ou Master Admin impersonando**: navegar para `/`

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/settings/SettingsSidebar.tsx` | Linha 35: Adicionar lógica condicional no botão "Voltar" |

---

### Mudança de Código

**Arquivo**: `src/components/settings/SettingsSidebar.tsx`

**De (linha 32-40):**
```typescript
<Button 
  variant="ghost" 
  size="sm"
  onClick={() => navigate('/')}
  className="justify-start gap-2 mb-6 hover:bg-accent/80"
>
  <ArrowLeft className="h-4 w-4" />
  Voltar
</Button>
```

**Para:**
```typescript
<Button 
  variant="ghost" 
  size="sm"
  onClick={() => {
    // Master Admin sem organização impersonada vai para /master
    if (isMasterAdmin && !effectiveOrgId) {
      navigate('/master');
    } else {
      navigate('/');
    }
  }}
  className="justify-start gap-2 mb-6 hover:bg-accent/80"
>
  <ArrowLeft className="h-4 w-4" />
  Voltar
</Button>
```

---

### Resultado Esperado

- O Master Admin será direcionado corretamente para `/master` ao clicar em "Voltar"
- Usuários normais continuarão indo para `/` (dashboard principal)
- Master Admin impersonando uma organização irá para `/` (para ver o dashboard da organização impersonada)

