

## Plano: Alinhar Badge de Status à Direita do Título

### Situação Atual

O código na linha 54 já usa `flex items-center justify-between`:

```tsx
<div className="flex items-center justify-between">
  <SheetTitle className="text-xl">Detalhes da Venda</SheetTitle>
  <Badge>...</Badge>
</div>
```

Isso já deveria alinhar o badge à direita. Porém, o `SheetHeader` pode ter estilos que afetam o layout.

### Solução

Garantir que o container flex ocupe toda a largura disponível adicionando `w-full`:

```tsx
<div className="flex items-center justify-between w-full">
```

### Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/dashboard/SaleDetailSheet.tsx` | Adicionar `w-full` ao container flex na linha 54 |

### Mudança

**Linha 54:**

De:
```tsx
<div className="flex items-center justify-between">
```

Para:
```tsx
<div className="flex items-center justify-between w-full">
```

### Resultado Esperado

```text
┌─────────────────────────────────────────────────┐
│ Detalhes da Venda                    [Aprovado] │
│ NF-e 770 • 16 de Janeiro de 2026                │
└─────────────────────────────────────────────────┘
```

O badge ficará alinhado ao canto direito do header.

