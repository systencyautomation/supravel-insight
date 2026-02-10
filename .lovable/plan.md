

# Remover Filtro de Parcelas por Valor de Entrada

## Problema
O filtro atual em `useSalesWithCalculations.ts` remove todas as parcelas cujo valor coincide com o `valor_entrada`, causando o desaparecimento de parcelas legitimas (como no caso do cliente 817 VILSON BORGES PADILHA).

## Solucao
Remover completamente a logica de filtragem. Todas as parcelas retornadas do banco serao usadas diretamente, sem exclusao.

## Alteracao

**Arquivo: `src/hooks/useSalesWithCalculations.ts`**

Substituir o bloco de filtragem (linhas ~56-67):
```typescript
// REMOVER: filtro que exclui parcelas com valor igual a entrada
const parcelasReais = saleInstallments.filter((inst) => {
  if (valorEntradaSalvo > 0 && Math.abs(Number(inst.value) - valorEntradaSalvo) < 0.01) {
    return false;
  }
  return true;
});
```

Por uso direto:
```typescript
const parcelasReais = saleInstallments;
```

O restante do codigo continua funcionando normalmente pois `somaParcelas` e `qtdParcelas` serao calculados sobre todas as parcelas do banco.
