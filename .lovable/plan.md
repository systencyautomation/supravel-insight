
# Plano: Salvar Parcelas Editadas na Calculadora

## Problema

Quando o usuário altera o número de parcelas ou valor da entrada na calculadora de comissões:

1. **O XML nem sempre traz todas as parcelas** (ex: só 9 de 10)
2. **As alterações não são salvas** no banco de dados
3. **A última parcela mostra valor errado** (R$ 16.000 em vez de R$ 8.000)
4. **Falta cálculo automático de datas de vencimento** (+30 dias, pulando finais de semana/feriados)

## Exemplo do Problema

```
Calculadora mostra: 10 parcelas × R$ 8.000
Banco de dados: 9 parcelas existentes + 1 nova que não foi criada
SaleDetailSheet mostra: Parcela 9 com R$ 16.000 (porque está somando 2 parcelas)
```

## Solução

### 1. Criar Função de Dias Úteis

Novo arquivo utilitário para calcular próximo dia útil:

```typescript
// src/lib/businessDays.ts

const BRAZILIAN_HOLIDAYS_2026 = [
  '2026-01-01', // Confraternização Universal
  '2026-02-16', // Carnaval
  '2026-02-17', // Carnaval
  '2026-04-03', // Sexta-feira Santa
  '2026-04-21', // Tiradentes
  '2026-05-01', // Dia do Trabalho
  '2026-06-04', // Corpus Christi
  '2026-09-07', // Independência
  '2026-10-12', // Padroeira
  '2026-11-02', // Finados
  '2026-11-15', // Proclamação da República
  '2026-12-25', // Natal
];

export function isBusinessDay(date: Date): boolean {
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  
  const dateStr = date.toISOString().split('T')[0];
  return !BRAZILIAN_HOLIDAYS_2026.includes(dateStr);
}

export function addBusinessDays(startDate: Date, days: number): Date {
  let result = new Date(startDate);
  result.setDate(result.getDate() + days);
  
  while (!isBusinessDay(result)) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

export function generateInstallmentDates(
  baseDate: Date,
  qtdParcelas: number
): Date[] {
  const dates: Date[] = [];
  let currentDate = new Date(baseDate);
  
  for (let i = 0; i < qtdParcelas; i++) {
    // Primeira parcela: +30 dias da data base
    currentDate = addBusinessDays(currentDate, 30);
    dates.push(new Date(currentDate));
  }
  
  return dates;
}
```

### 2. Passar Parcelas da Calculadora para o Salvamento

Modificar a estrutura `CalculationData` para incluir informações das parcelas:

```typescript
// src/components/approval/CommissionCalculator.tsx

export interface CalculationData {
  // ...campos existentes...
  
  // NOVO: Parcelas geradas para salvar
  parcelasGeradas: {
    installment_number: number;
    value: number;
    due_date: string;
  }[];
}
```

### 3. Atualizar Calculadora para Gerar Datas

Na `CommissionCalculator`, gerar as parcelas com datas:

```typescript
// Dentro do useMemo que calcula parcelas
const parcelasGeradas = useMemo(() => {
  if (qtdParcelas <= 0 || tipoPagamento === 'a_vista') return [];
  
  const baseDate = sale?.emission_date 
    ? new Date(sale.emission_date) 
    : new Date();
    
  const dates = generateInstallmentDates(baseDate, qtdParcelas);
  
  return dates.map((dueDate, index) => ({
    installment_number: index + 1,
    value: valorParcela,
    due_date: dueDate.toISOString().split('T')[0],
  }));
}, [qtdParcelas, valorParcela, tipoPagamento, sale?.emission_date]);
```

### 4. Salvar Parcelas na Aprovação

Modificar `SalesApproval.tsx` para sincronizar parcelas:

```typescript
// handleApproveWithAssignment
const syncInstallments = async (saleId: string, parcelas: ParcelaGerada[]) => {
  // 1. Deletar parcelas existentes
  await supabase
    .from('installments')
    .delete()
    .eq('sale_id', saleId);
  
  // 2. Inserir novas parcelas
  if (parcelas.length > 0) {
    const installmentsToInsert = parcelas.map(p => ({
      organization_id: effectiveOrgId,
      sale_id: saleId,
      installment_number: p.installment_number,
      value: p.value,
      due_date: p.due_date,
      status: 'pendente',
    }));
    
    await supabase
      .from('installments')
      .insert(installmentsToInsert);
  }
};
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/businessDays.ts` | NOVO - Funções de dias úteis |
| `src/components/approval/CommissionCalculator.tsx` | Adicionar geração de parcelas com datas |
| `src/pages/SalesApproval.tsx` | Sincronizar parcelas ao salvar |
| `src/components/approval/SellerAssignment.tsx` | Passar parcelas para o salvamento |

## Fluxo Completo

```
1. Usuário edita "Número de Parcelas" → 10
2. Calculadora recalcula:
   - valorParcela = (130.000 - 50.000) / 10 = 8.000
   - Gera 10 datas de vencimento (+30 dias úteis cada)
3. Usuário clica "Próxima Etapa"
4. Sistema salva:
   - Deleta parcelas antigas (9)
   - Insere novas parcelas (10 × R$ 8.000)
   - Cada uma com data de vencimento em dia útil
5. SaleDetailSheet mostra corretamente:
   - Parcela 1: 12/02/2026 - R$ 8.000
   - Parcela 2: 12/03/2026 - R$ 8.000
   - ...
   - Parcela 10: 12/11/2026 - R$ 8.000
```

## Cálculo de Datas

| Parcela | Cálculo | Data |
|---------|---------|------|
| 1 | Emissão + 30 dias úteis | 12/02/2026 |
| 2 | Parcela 1 + 30 dias úteis | 12/03/2026 |
| 3 | Parcela 2 + 30 dias úteis | 14/04/2026 |
| ... | ... | ... |

Se cair em sábado/domingo/feriado, avança para próximo dia útil.
