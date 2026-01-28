
# Correção: Botão Editar com Erro 404

## Problema Identificado
A navegação está usando `/sales-approval` mas a rota definida no `App.tsx` é `/aprovacao`. Por isso o erro 404.

## Correções Necessárias

### 1. `src/components/tabs/InternalSellerCommissions.tsx`

**Corrigir URL de navegação (linha 439):**
```typescript
// De:
navigate(`/sales-approval?mode=edit&saleId=${saleId}&step=2`);

// Para:
navigate(`/aprovacao?mode=edit&saleId=${saleId}&step=2`);
```

**Tornar botão mais discreto (linhas 143-154):**
```typescript
// De:
<Button
  variant="outline"
  size="sm"
  onClick={(e) => {
    e.stopPropagation();
    onEdit(sale.id);
  }}
>
  <Pencil className="h-4 w-4 mr-1" />
  Editar
</Button>

// Para:
<Button
  variant="ghost"
  size="icon"
  className="h-7 w-7 text-muted-foreground hover:text-foreground"
  onClick={(e) => {
    e.stopPropagation();
    onEdit(sale.id);
  }}
  title="Editar comissão"
>
  <Pencil className="h-3.5 w-3.5" />
</Button>
```

## Resultado Visual

```text
┌─────────────────────────────────────────────────────────────────┐
│  Comissão Base               │  Over Price                      │
│  ...                         │  ...                             │
├─────────────────────────────────────────────────────────────────┤
│  Total Vendedor: R$ 1.171,75                              [✏️]  │
└─────────────────────────────────────────────────────────────────┘
```

O botão agora é apenas um ícone de lápis discreto, usando `variant="ghost"` e tamanho menor.
