
# Plano: Tabela de Comissões do Vendedor com Detalhes Expansíveis

## Resumo
Atualizar a tabela de comissões do vendedor interno para exibir separadamente o valor da comissão base, o valor do over, e o total. Cada linha será clicável para expandir e mostrar o detalhamento completo do cálculo.

---

## Estrutura Atual vs. Nova

### Colunas Atuais
| Data | Cliente | NF-e | Valor NF | Base | Over Líquido | Comissão | Status |

### Colunas Novas
| Data | Cliente | NF-e | Valor NF | Comissão | Over | Total | Status |

**Diferença:**
- "Base (Tabela)" removida da tabela principal (vai para detalhes)
- "Over Líquido" renomeado para "Over" (mostra apenas a parte do vendedor)
- "Comissão" agora mostra apenas a parte base
- Nova coluna "Total" no final

---

## Layout da Linha Expandida

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 15/01/2025  Cliente ABC   NF 123   R$ 50.000   R$ 629   R$ 542   R$ 1.171   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ▼ Detalhes do Cálculo                                                      │
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐          │
│  │ Comissão Base               │  │ Over Price                   │          │
│  │ Base: R$ 20.991,67 (Tabela) │  │ Over Líquido: R$ 5.420,00    │          │
│  │ Percentual: 3%              │  │ Percentual: 10%              │          │
│  │ Valor: R$ 629,75            │  │ Valor: R$ 542,00             │          │
│  └─────────────────────────────┘  └─────────────────────────────┘          │
│                                                                             │
│  Total Vendedor: R$ 1.171,75                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Arquivo a Modificar

### `src/components/tabs/InternalSellerCommissions.tsx`

**Mudanças:**

1. **Importar componente Collapsible**
   ```typescript
   import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
   import { ChevronDown } from 'lucide-react';
   ```

2. **Adicionar estado para controlar linhas expandidas**
   ```typescript
   const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
   
   const toggleRow = (saleId: string) => {
     setExpandedRows(prev => {
       const next = new Set(prev);
       if (next.has(saleId)) {
         next.delete(saleId);
       } else {
         next.add(saleId);
       }
       return next;
     });
   };
   ```

3. **Atualizar cabeçalho da tabela**
   ```typescript
   <TableHead>Data</TableHead>
   <TableHead>Cliente</TableHead>
   <TableHead>NF-e</TableHead>
   <TableHead className="text-right">Valor NF</TableHead>
   <TableHead className="text-right">Comissão</TableHead>
   <TableHead className="text-right">Over</TableHead>
   <TableHead className="text-right">Total</TableHead>
   <TableHead>Status</TableHead>
   ```

4. **Modificar linhas da tabela para serem clicáveis**
   - Linha principal com cursor pointer
   - Ícone de chevron indicando expansão
   - Linha adicional (colSpan full) para o conteúdo expandido

5. **Conteúdo expandido mostra:**
   - Base de cálculo usada (Tabela ou Comissão Empresa)
   - Valor da base
   - Percentual aplicado sobre a base
   - Resultado da comissão base
   - Over líquido da venda
   - Percentual do over configurado
   - Resultado do over
   - Total final

---

## Detalhes Técnicos

### Cálculos Exibidos

```typescript
// Valores para exibir na linha principal
const comissaoBase = baseCalculo * (percentualVendedor / 100);
const comissaoOver = overLiquido * (overPercent / 100);
const comissaoTotal = comissaoBase + comissaoOver;

// Valores para detalhes expandidos
const detalhes = {
  // Comissão Base
  tipoBase: comissaoBase === 'valor_tabela' ? 'Valor de Tabela' : 'Comissão da Empresa',
  valorBase: baseCalculo,
  percentualBase: percentualVendedor,
  resultadoBase: comissaoBase,
  
  // Over
  overLiquidoVenda: overLiquido,
  percentualOver: overPercent,
  resultadoOver: comissaoOver,
  
  // Total
  total: comissaoTotal,
};
```

### Estilização da Linha Clicável

```typescript
<TableRow 
  className="cursor-pointer hover:bg-muted/50 transition-colors"
  onClick={() => toggleRow(sale.id)}
>
  {/* Primeira célula com ícone de expansão */}
  <TableCell className="flex items-center gap-2">
    <ChevronDown 
      className={cn(
        "h-4 w-4 transition-transform",
        expandedRows.has(sale.id) && "rotate-180"
      )} 
    />
    {format(date, 'dd/MM/yyyy')}
  </TableCell>
  {/* ... outras células */}
</TableRow>
```

### Linha de Detalhes Expandidos

```typescript
{expandedRows.has(sale.id) && (
  <TableRow className="bg-muted/20 hover:bg-muted/20">
    <TableCell colSpan={8} className="p-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Card Comissão Base */}
        <div className="bg-background border rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Comissão Base
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base ({baseLabel})</span>
              <span className="font-mono">{formatCurrency(baseCalculo)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Percentual</span>
              <span className="font-mono">{percentualVendedor}%</span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Resultado</span>
              <span className="font-mono">{formatCurrency(comissaoBase)}</span>
            </div>
          </div>
        </div>
        
        {/* Card Over */}
        <div className="bg-background border rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Over Price
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Over Líquido</span>
              <span className="font-mono">{formatCurrency(overLiquido)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Percentual</span>
              <span className="font-mono">{overPercent}%</span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Resultado</span>
              <span className="font-mono">{formatCurrency(comissaoOver)}</span>
            </div>
          </div>
        </div>
      </div>
    </TableCell>
  </TableRow>
)}
```

---

## Comportamento UX

- Clicar em qualquer lugar da linha expande/colapsa
- Ícone de seta indica estado (rotaciona 180 graus quando expandido)
- Múltiplas linhas podem estar expandidas simultaneamente
- Linha expandida tem fundo levemente diferente para destacar
- Animação suave na expansão/colapso

---

## Ordem de Implementação

1. Adicionar estado para controle de linhas expandidas
2. Atualizar colunas do cabeçalho (Comissão, Over, Total)
3. Modificar células da linha para novos valores
4. Adicionar interatividade de clique
5. Implementar linha de detalhes expandida
6. Testar com dados reais
