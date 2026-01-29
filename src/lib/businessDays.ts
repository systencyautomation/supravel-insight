// Utilitário para cálculo de dias úteis considerando feriados brasileiros

// Feriados nacionais brasileiros - adicionar mais anos conforme necessário
const BRAZILIAN_HOLIDAYS: Record<string, string[]> = {
  '2025': [
    '2025-01-01', // Confraternização Universal
    '2025-03-03', // Carnaval
    '2025-03-04', // Carnaval
    '2025-04-18', // Sexta-feira Santa
    '2025-04-21', // Tiradentes
    '2025-05-01', // Dia do Trabalho
    '2025-06-19', // Corpus Christi
    '2025-09-07', // Independência
    '2025-10-12', // Nossa Senhora Aparecida
    '2025-11-02', // Finados
    '2025-11-15', // Proclamação da República
    '2025-12-25', // Natal
  ],
  '2026': [
    '2026-01-01', // Confraternização Universal
    '2026-02-16', // Carnaval
    '2026-02-17', // Carnaval
    '2026-04-03', // Sexta-feira Santa
    '2026-04-21', // Tiradentes
    '2026-05-01', // Dia do Trabalho
    '2026-06-04', // Corpus Christi
    '2026-09-07', // Independência
    '2026-10-12', // Nossa Senhora Aparecida
    '2026-11-02', // Finados
    '2026-11-15', // Proclamação da República
    '2026-12-25', // Natal
  ],
  '2027': [
    '2027-01-01', // Confraternização Universal
    '2027-02-08', // Carnaval
    '2027-02-09', // Carnaval
    '2027-03-26', // Sexta-feira Santa
    '2027-04-21', // Tiradentes
    '2027-05-01', // Dia do Trabalho
    '2027-05-27', // Corpus Christi
    '2027-09-07', // Independência
    '2027-10-12', // Nossa Senhora Aparecida
    '2027-11-02', // Finados
    '2027-11-15', // Proclamação da República
    '2027-12-25', // Natal
  ],
};

/**
 * Verifica se uma data é um dia útil (não é fim de semana nem feriado)
 */
export function isBusinessDay(date: Date): boolean {
  const dayOfWeek = date.getDay();
  
  // Sábado (6) ou Domingo (0) não são dias úteis
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }
  
  // Verificar se é feriado
  const year = date.getFullYear().toString();
  const dateStr = formatDateToISO(date);
  
  const holidays = BRAZILIAN_HOLIDAYS[year] || [];
  return !holidays.includes(dateStr);
}

/**
 * Avança para o próximo dia útil se a data não for dia útil
 */
export function nextBusinessDay(date: Date): Date {
  const result = new Date(date);
  
  while (!isBusinessDay(result)) {
    result.setDate(result.getDate() + 1);
  }
  
  return result;
}

/**
 * Adiciona N dias corridos e depois ajusta para dia útil se necessário
 */
export function addDaysAndAdjust(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  result.setDate(result.getDate() + days);
  
  // Se cair em fim de semana ou feriado, avançar para próximo dia útil
  return nextBusinessDay(result);
}

/**
 * Formata data para ISO (YYYY-MM-DD)
 */
function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Interface para parcela gerada
 */
export interface GeneratedInstallment {
  installment_number: number;
  value: number;
  due_date: string; // ISO format YYYY-MM-DD
}

/**
 * Gera lista de parcelas com datas de vencimento
 * Cada parcela vence 30 dias após a anterior, ajustando para dia útil
 */
export function generateInstallmentDates(
  baseDate: Date,
  qtdParcelas: number,
  valorParcela: number
): GeneratedInstallment[] {
  if (qtdParcelas <= 0 || valorParcela <= 0) {
    return [];
  }
  
  const installments: GeneratedInstallment[] = [];
  let currentDate = new Date(baseDate);
  
  for (let i = 1; i <= qtdParcelas; i++) {
    // Avançar 30 dias a partir da data anterior
    currentDate = addDaysAndAdjust(currentDate, 30);
    
    installments.push({
      installment_number: i,
      value: valorParcela,
      due_date: formatDateToISO(currentDate),
    });
  }
  
  return installments;
}
