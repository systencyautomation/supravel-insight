

# Correção: Comissão de Representante usando percentual errado

## Problema identificado

O componente `RepresentativeCommissions.tsx` usa `sale.percentual_comissao` (percentual da empresa, ex: 10%) para calcular a comissão do representante, quando deveria usar `sale.representative_percent` (percentual individual, ex: 2%).

Isso infla o valor exibido. No caso do Alex Severo com a COOPERATIVA TAQUARI JACUI:
- Exibido: R$ 75.451,44 x 10% = R$ 7.545,14 (errado)
- Correto: R$ 75.451,44 x 2% = R$ 1.509,03

## Correção

### Arquivo: `src/components/tabs/RepresentativeCommissions.tsx`

Substituir todas as ocorrencias de:
```typescript
const percentualRep = Number(sale.percentual_comissao) || 3;
```

Por:
```typescript
const percentualRep = Number(sale.representative_percent) || 3;
```

Essa linha aparece 3 vezes no arquivo:
1. Linha 115 - calculo do `totalComissao` por representante
2. Linha ~130 - calculo da `comissaoPaga`
3. Linha ~240 - calculo individual por venda na tabela

Nenhuma outra alteracao e necessaria. O campo `representative_percent` ja esta salvo corretamente no banco (valor 2 para esta venda).

## Secao Tecnica

- O campo `percentual_comissao` na tabela `sales` armazena o percentual base da empresa (usado para calculo da comissao da empresa sobre o valor de tabela)
- O campo `representative_percent` armazena o percentual individual atribuido ao representante na aprovacao
- O mesmo padrao ja funciona corretamente para vendedores internos no `InternalSellerCommissions`, que usa `sale.internal_seller_percent`

