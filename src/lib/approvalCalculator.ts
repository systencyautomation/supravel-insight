// Taxas fixas de dedução
const PIS_COFINS_RATE = 0.0925; // 9,25%
const IR_CSLL_RATE = 0.34; // 34%

// Taxas de juros mensais para cálculo de Valor Presente
const TAXA_BOLETO = 0.022; // 2,2% ao mês
const TAXA_CARTAO = 0.035; // 3,5% ao mês

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

export interface ApprovalCalculationParams {
  valorNF: number;           // Valor Real (com VP aplicado) - usado para Over Price
  valorFaturado: number;     // Valor Faturado da NF - usado para calcular percentual final
  valorTabela: number;
  percentualComissao: number;
  icmsOrigem: number;
  icmsDestino: number;
}

export interface ApprovalCalculationResult {
  valorTabelaAjustado: number;
  overPrice: number;
  deducaoIcms: number;
  deducaoPisCofins: number;
  deducaoIrCsll: number;
  overLiquido: number;
  comissaoPedido: number;
  comissaoTotal: number;
  percentualFinal: number;
}

export function getIcmsRate(uf: string): number {
  return ICMS_RATES[uf?.toUpperCase()] ?? 0.12;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * Retorna a taxa de juros mensal baseada no tipo de pagamento
 */
export function getTaxaJuros(tipoPagamento: string): number {
  if (tipoPagamento === 'parcelado_boleto') return TAXA_BOLETO;
  if (tipoPagamento === 'parcelado_cartao') return TAXA_CARTAO;
  return 0;
}

/**
 * Calcula o Valor Presente de uma série de parcelas
 * VP = PMT × [(1 - (1 + i)^(-n)) / i]
 */
export function calcularValorPresente(
  valorParcela: number,
  numParcelas: number,
  taxaMensal: number
): number {
  if (numParcelas <= 0) return 0;
  if (taxaMensal <= 0) return valorParcela * numParcelas;
  
  const fatorVP = (1 - Math.pow(1 + taxaMensal, -numParcelas)) / taxaMensal;
  return valorParcela * fatorVP;
}

/**
 * Calcula o Valor Real da venda considerando VP para parcelamentos
 * À vista: Valor NF direto
 * Parcelado: Entrada + VP(parcelas)
 */
export function calcularValorReal(
  tipoPagamento: 'a_vista' | 'parcelado_boleto' | 'parcelado_cartao',
  valorNF: number,
  valorEntrada: number,
  valorParcela: number,
  numParcelas: number
): number {
  if (tipoPagamento === 'a_vista') {
    return valorNF;
  }
  
  const taxa = getTaxaJuros(tipoPagamento);
  const vpParcelas = calcularValorPresente(valorParcela, numParcelas, taxa);
  
  return valorEntrada + vpParcelas;
}

export function calculateApprovalCommission(
  params: ApprovalCalculationParams
): ApprovalCalculationResult {
  const { valorNF, valorFaturado, valorTabela, percentualComissao, icmsOrigem, icmsDestino } = params;

  // Debug log
  console.log('[approvalCalculator] Entrada:', {
    valorNF,
    valorTabela,
    percentualComissao,
    icmsOrigem,
    icmsDestino
  });

  // Valor Tabela Ajustado (considerando ICMS)
  // Se ICMS origem = ICMS destino, não precisa ajustar
  // Comparação com tolerância para evitar problemas de ponto flutuante
  let valorTabelaAjustado = valorTabela;
  const icmsDiferente = Math.abs(icmsOrigem - icmsDestino) > 0.001;
  
  if (icmsDiferente && icmsOrigem > 0) {
    // Fórmula: valorTabela / (1 - icmsOrigem) * (1 - icmsDestino)
    valorTabelaAjustado = valorTabela / (1 - icmsOrigem) * (1 - icmsDestino);
    console.log('[approvalCalculator] ICMS diferente, ajustando:', { icmsOrigem, icmsDestino, valorTabelaAjustado });
  } else {
    console.log('[approvalCalculator] ICMS igual, sem ajuste:', valorTabelaAjustado);
  }

  // Over Price = Valor Real (VP) - Valor Tabela Ajustado
  const overPrice = valorNF - valorTabelaAjustado;
  console.log('[approvalCalculator] Over Price:', overPrice, '=', valorNF, '-', valorTabelaAjustado);

  // Inicializa deduções
  let deducaoIcms = 0;
  let deducaoPisCofins = 0;
  let deducaoIrCsll = 0;
  let overLiquido = 0;

  if (overPrice > 0) {
    // Deduções do Over (aplicadas em cascata)
    deducaoIcms = overPrice * icmsDestino;
    
    const subtotalAposIcms = overPrice - deducaoIcms;
    deducaoPisCofins = subtotalAposIcms * PIS_COFINS_RATE;
    
    const subtotalAposPisCofins = subtotalAposIcms - deducaoPisCofins;
    deducaoIrCsll = subtotalAposPisCofins * IR_CSLL_RATE;
    
    overLiquido = subtotalAposPisCofins - deducaoIrCsll;
    
    console.log('[approvalCalculator] Deduções:', { deducaoIcms, deducaoPisCofins, deducaoIrCsll, overLiquido });
  } else {
    // Over negativo: sem deduções fiscais, over líquido = over bruto (penaliza a comissão)
    overLiquido = overPrice;
    console.log('[approvalCalculator] Over negativo, penalizando comissão:', overPrice);
  }

  // Comissão do pedido (% sobre valor tabela ORIGINAL, não ajustado)
  const comissaoPedido = (percentualComissao / 100) * valorTabela;
  console.log('[approvalCalculator] Comissão Pedido:', comissaoPedido, '=', percentualComissao, '% de', valorTabela);

  // Comissão total = Comissão do Pedido + Over Líquido
  const comissaoTotal = comissaoPedido + overLiquido;

  // Percentual final sobre VALOR FATURADO DA NF (não sobre Valor Presente)
  const percentualFinal = valorFaturado > 0 ? (comissaoTotal / valorFaturado) * 100 : 0;

  console.log('[approvalCalculator] Resultado:', { comissaoPedido, overLiquido, comissaoTotal, percentualFinal, valorFaturado });

  return {
    valorTabelaAjustado,
    overPrice,
    deducaoIcms,
    deducaoPisCofins,
    deducaoIrCsll,
    overLiquido,
    comissaoPedido,
    comissaoTotal,
    percentualFinal,
  };
}
