
## Plano: Nova Aba "Recebimentos" em Empresa

### Objetivo
Criar uma nova sub-aba chamada "Recebimentos" dentro de Empresa que mostra uma visão detalhada de todos os pagamentos (entrada e parcelas) com filtros intuitivos, similar ao modelo Excel do usuário.

---

### Estrutura da Nova Aba

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Dashboard]  [Vendas]  [Recebimentos]                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────┐   VALOR PENDENTE A RECEBER    │
│  │ VENDEDOR   [Todos ▼]                     │   R$ 268.278,16               │
│  └──────────────────────────────────────────┘                               │
│                                                                             │
│  FILTROS:                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Data Início      Data Fim         Nome/Cliente      NF       Produto  │  │
│  │ [📅 01/01/2026] [📅 26/01/2026]  [___________]   [____]    [______]   │  │
│  │                                                                       │  │
│  │ Status: [○ Todos] [● Pago] [● Pendente]          [🔍 Filtrar] [Limpar] │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Data     │ NF  │ Cliente          │ Produto │ Valor    │ % Com│ Valor │  │
│  │          │     │                  │         │ Total    │      │ Com   │Status│
│  ├──────────┼─────┼──────────────────┼─────────┼──────────┼──────┼───────┼──────┤
│  │18/12/2025│ 770 │MERCADO ALT SELETO│ CDD12J  │ 8.336,00 │ 11%  │ 383,56│ Pago │
│  │18/01/2026│ 770 │MERCADO ALT SELETO│ CDD12J  │ 4.637,35 │ 11%  │ 516,71│Pend. │
│  │18/01/2026│ 770 │MERCADO ALT SELETO│ CDD12J  │ 4.637,35 │ 11%  │ 516,71│Pend. │
│  │17/03/2026│ 770 │MERCADO ALT SELETO│ CDD12   │ 4.637,35 │ 11%  │ 516,71│Pend. │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/empresa/EmpresaRecebimentos.tsx` | Criar | Novo componente principal da aba |
| `src/components/empresa/RecebimentosFilters.tsx` | Criar | Componente de filtros (datas, texto, status) |
| `src/components/empresa/RecebimentosTable.tsx` | Criar | Tabela de recebimentos com ações |
| `src/hooks/useRecebimentosData.ts` | Criar | Hook para processar entrada + parcelas como linhas individuais |
| `src/pages/Index.tsx` | Modificar | Adicionar nova sub-aba "Recebimentos" |

---

### Detalhes Técnicos

#### 1. Hook useRecebimentosData.ts

**Propósito**: Transformar dados de vendas e parcelas em uma lista unificada de "recebimentos"

**Estrutura do Recebimento:**
```typescript
interface Recebimento {
  id: string;                    // ID único (sale_id + tipo + número)
  sale_id: string;               // Referência à venda
  tipo: 'entrada' | 'parcela';   // Tipo do recebimento
  numero_parcela?: number;       // Número da parcela (se aplicável)
  data: Date;                    // Data do vencimento/pagamento
  nf: string;                    // Número da NF
  cliente: string;               // Nome do cliente
  produto: string;               // Modelo do produto
  valor: number;                 // Valor do recebimento
  percentual_comissao: number;   // % de comissão
  valor_comissao: number;        // Valor da comissão calculado
  status: 'pago' | 'pendente';   // Status do pagamento
}
```

**Lógica de transformação:**
1. Para cada venda aprovada/paga, criar um recebimento de "entrada" usando `valor_entrada` e `emission_date`
2. Para cada parcela em `installments`, criar um recebimento usando `due_date` e `value`
3. Calcular comissão: `percentual * valor / 100`
4. Unificar em lista ordenável e filtrável

#### 2. RecebimentosFilters.tsx

**Componentes de filtro:**

- **Data Início / Data Fim**: Dois DatePickers independentes para selecionar período
- **Cliente**: Input de texto com busca
- **NF**: Input de texto
- **Produto**: Input de texto
- **Status**: Radio buttons (Todos / Pago / Pendente)

**Layout:**
```tsx
<div className="grid grid-cols-5 gap-4">
  <DatePicker label="Data Início" />
  <DatePicker label="Data Fim" />
  <Input placeholder="Cliente..." />
  <Input placeholder="NF..." />
  <Input placeholder="Produto..." />
</div>
<div className="flex items-center gap-4">
  <RadioGroup value={status}>
    <Radio value="todos">Todos</Radio>
    <Radio value="pago">Pago</Radio>
    <Radio value="pendente">Pendente</Radio>
  </RadioGroup>
  <Button>Filtrar</Button>
  <Button variant="ghost">Limpar</Button>
</div>
```

#### 3. RecebimentosTable.tsx

**Colunas:**

| Coluna | Campo | Tipo |
|--------|-------|------|
| Data | data | date |
| NF | nf | text |
| Cliente | cliente | text |
| Produto | produto | text |
| Valor Total | valor | currency |
| % Comiss | percentual_comissao | percent |
| Valor Comiss | valor_comissao | currency |
| Status | status | badge + toggle |

**Funcionalidades:**
- Ordenação por qualquer coluna
- Status clicável para alternar entre Pago/Pendente
- Badge colorido (verde=Pago, amarelo=Pendente)

**Atualização de Status:**
```typescript
const updateStatus = async (recebimento: Recebimento, newStatus: 'pago' | 'pendente') => {
  if (recebimento.tipo === 'entrada') {
    // Atualizar sale.status ou campo específico de entrada
  } else {
    // Atualizar installments.status
    await supabase
      .from('installments')
      .update({ 
        status: newStatus,
        paid_at: newStatus === 'pago' ? new Date().toISOString() : null 
      })
      .eq('id', recebimento.installment_id);
  }
};
```

#### 4. EmpresaRecebimentos.tsx

**Componente principal:**
```tsx
export function EmpresaRecebimentos({ sales, loading, onRefresh }) {
  const { recebimentos, totalPendente } = useRecebimentosData(sales);
  const [filteredRecebimentos, setFilteredRecebimentos] = useState([]);
  
  return (
    <div className="space-y-4">
      {/* Header com total pendente */}
      <div className="flex justify-between items-center">
        <h2>Recebimentos</h2>
        <div className="text-right">
          <span className="text-sm text-muted-foreground">
            VALOR PENDENTE A RECEBER
          </span>
          <p className="text-2xl font-bold text-primary">
            {formatCurrency(totalPendente)}
          </p>
        </div>
      </div>
      
      {/* Filtros */}
      <RecebimentosFilters onFilter={setFilteredRecebimentos} />
      
      {/* Tabela */}
      <RecebimentosTable 
        recebimentos={filteredRecebimentos} 
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
```

#### 5. Index.tsx - Modificações

**Adicionar nova sub-aba:**
```tsx
<Tabs defaultValue="dashboard" className="space-y-4">
  <TabsList className="grid w-full max-w-lg grid-cols-3">  {/* Era cols-2 */}
    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
    <TabsTrigger value="vendas">Vendas</TabsTrigger>
    <TabsTrigger value="recebimentos">Recebimentos</TabsTrigger>  {/* Nova */}
  </TabsList>
  
  {/* ... tabs existentes ... */}
  
  <TabsContent value="recebimentos">
    <EmpresaRecebimentos
      sales={salesWithCalculations}
      loading={dataLoading}
      onRefresh={refetch}
    />
  </TabsContent>
</Tabs>
```

---

### Fluxo de Dados

```text
┌─────────────┐    ┌───────────────┐    ┌────────────────────┐
│   sales     │────▶│ useSalesWCalculations │────▶│ useRecebimentosData │
└─────────────┘    └───────────────┘    └──────────┬─────────┘
                                                    │
┌─────────────┐                                     │
│ installments│─────────────────────────────────────┘
└─────────────┘                                     │
                                                    ▼
                                        ┌───────────────────┐
                                        │ Lista unificada   │
                                        │ de Recebimentos   │
                                        │ (entrada+parcelas)│
                                        └───────────────────┘
```

---

### Filtros - Lógica de Aplicação

| Filtro | Lógica |
|--------|--------|
| Data Início | `recebimento.data >= dataInicio` |
| Data Fim | `recebimento.data <= dataFim` |
| Cliente | `recebimento.cliente.toLowerCase().includes(search)` |
| NF | `recebimento.nf.includes(search)` |
| Produto | `recebimento.produto.toLowerCase().includes(search)` |
| Status | `status === 'todos' OR recebimento.status === status` |

---

### Resultado Esperado

1. Nova aba "Recebimentos" no menu Empresa
2. Visualização de entrada + parcelas como linhas individuais
3. Filtros intuitivos com DatePickers para selecionar período
4. Filtros de texto para Cliente, NF, Produto
5. Toggle de status (Pago/Pendente) com atualização em tempo real
6. Cálculo automático de comissão por linha (% sobre valor)
7. Total pendente a receber sempre visível no topo
