export interface Sale {
  id: string;
  cliente: string;
  nfe: string;
  valorTotal: number;
  valorTabela: number;
  formaPagamento: 'boleto' | 'avista';
  uf: string;
  dataEmissao: string;
  status: 'pendente' | 'pago' | 'parcial';
  boletos?: number;
  vendedorInterno?: string;
  representante?: string;
}

export interface StockItem {
  id: string;
  modelo: string;
  codInterno: string;
  valorTabela: number;
  percentualComissao: number;
  quantidade: number;
}

export interface CommissionCalculation {
  overPrice: number;
  pisCofins: number;
  irCsll: number;
  icms: number;
  comissaoLiquida: number;
}

export const ICMS_RATES: Record<string, number> = {
  'SP': 0.12,
  'RJ': 0.12,
  'MG': 0.12,
  'RS': 0.12,
  'PR': 0.12,
  'SC': 0.12,
  'ES': 0.12,
  'BA': 0.07,
  'PE': 0.07,
  'CE': 0.07,
  'PA': 0.07,
  'MA': 0.07,
  'GO': 0.07,
  'AM': 0.07,
  'MT': 0.07,
  'MS': 0.07,
  'DF': 0.07,
  'default': 0.04
};

export function calculateICMSRate(uf: string): number {
  return ICMS_RATES[uf] || ICMS_RATES['default'];
}

export function calculateCommission(
  valorNF: number,
  valorTabela: number,
  uf: string
): CommissionCalculation {
  const overPrice = valorNF - valorTabela;
  const icmsRate = calculateICMSRate(uf);
  
  const icms = overPrice * icmsRate;
  const pisCofins = overPrice * 0.0925;
  const irCsll = overPrice * 0.34;
  
  const comissaoLiquida = overPrice - icms - pisCofins - irCsll;
  
  return {
    overPrice,
    pisCofins,
    irCsll,
    icms,
    comissaoLiquida
  };
}
