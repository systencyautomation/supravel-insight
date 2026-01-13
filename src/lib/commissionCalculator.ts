// Taxas fixas de dedução
const PIS_COFINS_RATE = 0.0925; // 9,25%
const IR_CSLL_RATE = 0.34; // 34%

// Tabela de ICMS por UF (interestadual)
const ICMS_RATES: Record<string, number> = {
  // Norte/Nordeste/Centro-Oeste e ES: 7%
  AC: 0.07, AL: 0.07, AM: 0.07, AP: 0.07, BA: 0.07, CE: 0.07,
  DF: 0.07, ES: 0.07, GO: 0.07, MA: 0.07, MT: 0.07, MS: 0.07,
  PA: 0.07, PB: 0.07, PE: 0.07, PI: 0.07, RN: 0.07, RO: 0.07,
  RR: 0.07, SE: 0.07, TO: 0.07,
  // Sul/Sudeste (exceto ES): 12%
  MG: 0.12, PR: 0.12, RJ: 0.12, RS: 0.12, SC: 0.12, SP: 0.12,
  // Produtos importados: 4%
  IMPORTADO: 0.04,
};

export interface CommissionResult {
  overBruto: number;
  pisCofins: number;
  irCsll: number;
  icms: number;
  icmsRate: number;
  comissaoLiquida: number;
}

export function calculateCommissionFromValues(
  totalValue: number,
  tableValue: number,
  uf: string
): CommissionResult {
  const overBruto = totalValue - tableValue;

  if (overBruto <= 0) {
    return {
      overBruto: 0,
      pisCofins: 0,
      irCsll: 0,
      icms: 0,
      icmsRate: 0,
      comissaoLiquida: 0,
    };
  }

  const icmsRate = ICMS_RATES[uf.toUpperCase()] ?? 0.12;
  
  // Deduções sobre o Over Bruto
  const pisCofins = overBruto * PIS_COFINS_RATE;
  const irCsll = overBruto * IR_CSLL_RATE;
  const icms = overBruto * icmsRate;

  // Comissão Líquida = Over Bruto - Deduções
  const comissaoLiquida = overBruto - pisCofins - irCsll - icms;

  return {
    overBruto,
    pisCofins,
    irCsll,
    icms,
    icmsRate,
    comissaoLiquida: Math.max(0, comissaoLiquida),
  };
}

export function getIcmsRate(uf: string): number {
  return ICMS_RATES[uf.toUpperCase()] ?? 0.12;
}

export function formatIcmsRate(uf: string): string {
  const rate = getIcmsRate(uf);
  return `${(rate * 100).toFixed(0)}%`;
}
