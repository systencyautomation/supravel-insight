

# Plano: Adicionar Comissão Pendente no Header de Recebimentos

## Objetivo

Mostrar no header da aba Recebimentos **dois indicadores** separados:
1. **Valor Pendente (Cliente)** - o que o cliente deve pagar
2. **Comissão a Receber** - o que a empresa ganha de comissão

## Situação Atual

O header mostra apenas:
```
VALOR PENDENTE A RECEBER
R$ 4.697,35
```

## Novo Layout Proposto

```
VALOR PENDENTE (CLIENTE)     COMISSÃO A RECEBER
R$ 4.697,35                  R$ 516,95
```

## Alterações

### Arquivo: `src/components/empresa/EmpresaRecebimentos.tsx`

**1. Adicionar cálculo da comissão pendente filtrada (após linha 74):**

```typescript
// Total pendente filtrado (valor do cliente)
const totalPendenteFiltrado = useMemo(() => {
  return filteredRecebimentos
    .filter(r => r.status === 'pendente')
    .reduce((acc, r) => acc + r.valor, 0);
}, [filteredRecebimentos]);

// NOVO: Total comissão pendente filtrada
const totalComissaoPendenteFiltrada = useMemo(() => {
  return filteredRecebimentos
    .filter(r => r.status === 'pendente')
    .reduce((acc, r) => acc + r.valor_comissao, 0);
}, [filteredRecebimentos]);
```

**2. Atualizar o header para mostrar ambos os valores (linhas 132-139):**

```tsx
<div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
  {/* Valor do Cliente */}
  <div className="text-right">
    <span className="text-sm text-muted-foreground uppercase tracking-wide">
      Valor Pendente (Cliente)
    </span>
    <p className="text-2xl font-bold text-primary">
      {formatCurrency(totalPendenteFiltrado)}
    </p>
  </div>
  
  {/* Comissão a Receber */}
  <div className="text-right">
    <span className="text-sm text-muted-foreground uppercase tracking-wide">
      Comissão a Receber
    </span>
    <p className="text-2xl font-bold text-green-600">
      {formatCurrency(totalComissaoPendenteFiltrada)}
    </p>
  </div>
</div>
```

## Resultado Visual Esperado

| Indicador | Cor | Valor (exemplo) |
|-----------|-----|-----------------|
| Valor Pendente (Cliente) | Azul (primary) | R$ 4.697,35 |
| Comissão a Receber | Verde | R$ 516,95 |

## Benefício

Quando filtrar por cliente, período ou NF, você verá imediatamente:
- Quanto o cliente deve pagar
- Quanto você vai receber de comissão

A soma funciona automaticamente quando aparecem múltiplos recebimentos no filtro.

