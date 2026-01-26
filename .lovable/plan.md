

## Plano: Afastar Badge do Botão de Fechar (X)

### Problema

O badge de status ("Aprovado") está sobrepondo o botão de fechar (X) do Sheet porque:
- O botão X está posicionado como `absolute right-4 top-4` (16px do canto)
- O container flex com `w-full` ocupa toda a largura, incluindo o espaço do X

### Solução

Adicionar `pr-8` (padding-right de 32px) ao container flex para criar espaço para o botão X:

```tsx
<div className="flex items-center justify-between w-full pr-8">
```

### Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/dashboard/SaleDetailSheet.tsx` | Adicionar `pr-8` na linha 54 |

### Mudança

**Linha 54:**

De:
```tsx
<div className="flex items-center justify-between w-full">
```

Para:
```tsx
<div className="flex items-center justify-between w-full pr-8">
```

### Resultado Esperado

```text
┌─────────────────────────────────────────────────┐
│ Detalhes da Venda              [Aprovado]    X  │
│ NF-e 770 • 16 de Janeiro de 2026                │
└─────────────────────────────────────────────────┘
```

O badge ficará à direita do título, mas com espaço suficiente para não sobrepor o botão de fechar.

