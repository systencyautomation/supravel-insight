

# Melhorias na Aprovacao de Vendas (4 itens)

## 1. Pendencias em formato de lista (sem anterior/proximo)

Substituir a navegacao "Anterior / Proximo" por uma lista lateral de vendas pendentes. O usuario clica na venda desejada e ela carrega na calculadora.

### Implementacao

- Criar um componente `PendingSalesList` que exibe todas as vendas pendentes em formato de lista compacta (NF, Cliente, Valor)
- No `SalesApproval.tsx`, substituir a navegacao anterior/proximo por esta lista no painel esquerdo (ou como sidebar)
- A lista destaca a venda selecionada e permite clicar em qualquer outra
- Remover os botoes `ChevronLeft`/`ChevronRight` e o texto "X de Y"
- Manter o contador de pendencias no header

Layout proposto: dividir a area em 3 paineis - Lista de Pendencias (estreito) | Tabela/Planilha | Calculadora. Ou alternativamente, colocar a lista como um dropdown/sidebar colapsavel no header.

**Abordagem escolhida**: Substituir o painel da Tabela (esquerdo) por um layout com tabs "Lista" e "Tabela", permitindo alternar entre ver a lista de pendencias e a planilha FIPE. A venda ativa fica destacada na lista.

## 2. Bug: cliente muda ao receber notificacao na calculadora

### Causa raiz

O `usePendingSales` tem `refetchInterval: 30000` (30s). Quando o refetch ocorre e uma venda e aprovada/removida da lista, o array `pendingSales` muda mas o `currentIndex` permanece o mesmo, fazendo o componente apontar para outra venda.

### Correcao

- Guardar o `currentSale.id` em um estado separado (`selectedSaleId`) ao inves de depender do `currentIndex`
- Quando `pendingSales` atualiza, buscar a venda pelo ID salvo ao inves de pelo indice
- Se a venda selecionada nao existir mais na lista (foi aprovada por outro usuario), mostrar uma notificacao e selecionar a primeira disponivel

## 3. ICMS default de 12% para 4%

### Correcao

- Alterar o `useState(12)` na linha 79 do `CommissionCalculator.tsx` para `useState(4)`:
  ```
  const [icmsTabela, setIcmsTabela] = useState(4);
  ```
- Garantir que o `useEffect` (linhas 220-244) nao sobrescreva o valor quando o usuario altera manualmente o tipo de pagamento. Adicionar uma flag `icmsEditadoManualmente` para proteger edicoes do usuario.
- Revisar a funcao `getIcmsRate` no `approvalCalculator.ts` para que o fallback default seja 0.04 (4%) ao inves de 0.12 (12%).

## 4. Esconder campos de parcela quando "a vista"

### Correcao

- Envolver os campos "Numero de Parcelas" e "Valor da Parcela" em uma condicao `tipoPagamento !== 'a_vista'`
- O campo "Entrada" continua visivel (exibe o valor faturado quando a vista)
- Garantir que mudar para "a vista" apenas sete `qtdParcelas = 0` e `valorParcelaReal = 0`, sem alterar ICMS, valor tabela, ou percentual de comissao
- Isolar o `useEffect` da linha 309-314 (sync entrada) para nao disparar side effects em outros campos

---

## Secao Tecnica

### Arquivos afetados

1. **`src/components/approval/PendingSalesList.tsx`** (novo) - Componente de lista de vendas pendentes
2. **`src/pages/SalesApproval.tsx`** - Substituir navegacao por lista; trocar `currentIndex` por `selectedSaleId`
3. **`src/components/approval/CommissionCalculator.tsx`** - Default ICMS 4%; esconder campos parcela; proteger ICMS de reset
4. **`src/lib/approvalCalculator.ts`** - Fallback `getIcmsRate` de 0.12 para 0.04

### Detalhes do PendingSalesList

```text
+-----------------------------+
| Vendas Pendentes (5)        |
+-----------------------------+
| [ativo] NFe 123 - R$ 20.600|
|   Cliente XPTO              |
+-----------------------------+
| NFe 456 - R$ 15.300         |
|   Cliente ABC               |
+-----------------------------+
| NFe 789 - R$ 42.100         |
|   Cliente DEF               |
+-----------------------------+
```

### Detalhes do fix de estabilidade (bug cliente muda)

No `SalesApproval.tsx`:
- Trocar `const [currentIndex, setCurrentIndex] = useState(0)` por `const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)`
- `currentSale` passa a ser: `pendingSales.find(s => s.id === selectedSaleId) || pendingSales[0]`
- Quando `selectedSaleId` nao esta na lista, selecionar automaticamente a primeira venda disponivel
- Remover funcoes `goToPrevious` e `goToNext`

### Detalhes do ICMS e campos de parcela

No `CommissionCalculator.tsx`:
- Linha 79: `useState(12)` para `useState(4)`
- Linhas 613-646: envolver colunas 2 e 3 do grid (parcelas e valor parcela) em `{tipoPagamento !== 'a_vista' && (...)}`
- Adicionar estado `icmsManual` para evitar que useEffects sobreescrevam valor definido pelo usuario
- O `onValueChange` do RadioGroup de pagamento nao deve tocar em `icmsTabela` nem `icmsDestino`

