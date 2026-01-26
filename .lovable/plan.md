

## Plano: Corrigir Cálculo de ICMS na Calculadora de Comissão

### Problema Identificado

| Situação | Comportamento Atual | Comportamento Esperado |
|----------|---------------------|------------------------|
| Editar venda aprovada | ICMS Tabela volta para 12% (baseado na UF) | Manter o ICMS que foi salvo (ex: 4%) |
| Produto importado (coluna 4%) | Busca sempre coluna "Valor 12%" | Verificar se produto tem valor na coluna 4% e usar esse ICMS |
| Salvar ICMS Tabela | Não é salvo no banco | Salvar o campo para recuperar depois |

**Exemplo do seu caso:**
- Produto CDD12J tem valor na coluna **4%** (importado)
- Você salvou com 4%, mas `percentual_icms` guarda o ICMS destino
- Ao reabrir, sistema calcula `getIcmsRate('SC') = 12%`

---

### Solução Proposta

#### 1. Adicionar campo `icms_tabela` no banco de dados

Nova coluna para persistir o ICMS da origem/tabela:

```sql
ALTER TABLE sales ADD COLUMN icms_tabela NUMERIC(5,2);
```

#### 2. Melhorar lógica de busca na planilha para detectar ICMS

Verificar em qual coluna o produto tem valor (12%, 7% ou 4%) e usar o ICMS correspondente:

```text
Planilha:
| Código | Valor 12% | Valor 7% | Valor 4% | Comissão |
|--------|-----------|----------|----------|----------|
| CDD12J |           |          | 20.991   | 8%       |

Lógica:
1. Se tem valor na coluna "4%" → ICMS = 4%
2. Se tem valor na coluna "7%" → ICMS = 7%
3. Se tem valor na coluna "12%" → ICMS = 12%
```

#### 3. No modo edição, priorizar valores salvos

Alterar o `useEffect` que carrega os dados:

```text
Atual:
  setIcmsTabela(getIcmsRate(sale.emitente_uf || 'SP') * 100);  // SEMPRE 12%

Novo:
  if (sale.icms_tabela != null) {
    setIcmsTabela(sale.icms_tabela);  // Usar valor salvo
  } else {
    // Fallback para detecção automática pela planilha
  }
```

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/migrations/` | Adicionar coluna `icms_tabela` |
| `src/components/approval/CommissionCalculator.tsx` | Melhorar busca na planilha para detectar coluna de ICMS |
| `src/components/approval/CommissionCalculator.tsx` | Carregar `icms_tabela` salvo no modo edição |
| `src/pages/SalesApproval.tsx` | Salvar `icms_tabela` junto com os outros campos |
| `src/hooks/useEditableSale.ts` | Incluir `icms_tabela` na query |
| `src/integrations/supabase/types.ts` | Atualizado automaticamente |

---

### Mudanças Detalhadas

#### 1. Nova lógica de busca na planilha (matchedFipeRow)

O código atual busca apenas a coluna "Valor 12%". A nova lógica vai:

```typescript
// Encontrar índices das três colunas de valor
const valor12Index = headerRow.findIndex(cell => 
  value.includes('valor') && value.includes('12%'));
const valor7Index = headerRow.findIndex(cell => 
  value.includes('valor') && value.includes('7%'));
const valor4Index = headerRow.findIndex(cell => 
  value.includes('valor') && value.includes('4%'));

// Ao encontrar o produto, verificar qual coluna tem valor
const valor4 = parseFloat(row[valor4Index]?.value) || 0;
const valor7 = parseFloat(row[valor7Index]?.value) || 0;
const valor12 = parseFloat(row[valor12Index]?.value) || 0;

// Prioridade: 4% > 7% > 12%
if (valor4 > 0) {
  return { valorTabela: valor4, icmsTabela: 4, comissao: ... };
} else if (valor7 > 0) {
  return { valorTabela: valor7, icmsTabela: 7, comissao: ... };
} else {
  return { valorTabela: valor12, icmsTabela: 12, comissao: ... };
}
```

#### 2. Carregar ICMS salvo no modo edição

```typescript
useEffect(() => {
  if (sale) {
    // ... outros campos ...
    
    // ICMS Tabela: priorizar valor salvo
    if (sale.icms_tabela != null) {
      setIcmsTabela(sale.icms_tabela);
    } else if (matchedFipeRow?.icmsTabela) {
      // Fallback: detectar pela planilha
      setIcmsTabela(matchedFipeRow.icmsTabela);
    } else {
      // Último fallback: UF do emitente
      setIcmsTabela(getIcmsRate(sale.emitente_uf || 'SP') * 100);
    }
  }
}, [sale, matchedFipeRow]);
```

#### 3. Salvar ICMS Tabela

No `handleSave` do `SalesApproval.tsx`:

```typescript
const updateData = {
  table_value: calculationData.valorTabela,
  percentual_comissao: calculationData.percentualComissao,
  percentual_icms: calculationData.icmsDestino,
  icms_tabela: calculationData.icmsTabela,  // NOVO
  // ... demais campos
};
```

---

### Fluxo Esperado Após Implementação

```text
1. Sistema lê planilha e encontra CDD12J
2. Verifica: coluna 4% tem valor? → SIM (R$ 20.991,67)
3. Define: valorTabela = 20.991,67, icmsTabela = 4%
4. Usuário aprova/salva venda
5. Banco salva: icms_tabela = 4
6. Usuário abre para editar
7. Sistema lê: sale.icms_tabela = 4
8. Campo ICMS Tabela mostra 4% ✓
```

---

### Seção Tecnica

**Migração SQL:**
```sql
ALTER TABLE public.sales 
ADD COLUMN icms_tabela NUMERIC(5,2);

COMMENT ON COLUMN public.sales.icms_tabela IS 
'ICMS da origem/tabela (4%, 7% ou 12%) detectado pela planilha FIPE';
```

**Interface matchedFipeRow atualizada:**
```typescript
interface MatchedFipeRow {
  rowIndex: number;
  valorTabela: number;
  icmsTabela: number;  // NOVO: 4, 7 ou 12
  comissao: number;
}
```

**Ordem de prioridade para ICMS Tabela:**
1. Valor salvo no banco (`sale.icms_tabela`)
2. Detecção automática pela planilha (qual coluna tem valor)
3. Fallback pela UF do emitente (`getIcmsRate`)

