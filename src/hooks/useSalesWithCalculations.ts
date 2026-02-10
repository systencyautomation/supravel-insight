import { useMemo } from 'react';
import { useOrganizationData, Installment } from './useOrganizationData';
import { SaleWithDetails } from './useSalesMetrics';
import { 
  calculateApprovalCommission, 
  calcularValorPresente, 
  getIcmsRate,
  getTaxaJuros 
} from '@/lib/approvalCalculator';

export interface SaleWithCalculations extends SaleWithDetails {
  // Dados de parcelas
  installments: Installment[];
  somaParcelas: number;
  qtdParcelas: number;
  
  // Valores calculados
  entradaCalculada: number;
  valorReal: number;
  jurosEmbutidos: number;
  
  // Over Price
  overPriceBruto: number;
  overPriceLiquido: number;
  
  // Deduções
  deducaoIcms: number;
  deducaoPisCofins: number;
  deducaoIrCsll: number;
  
  // Comissão da empresa (sempre calculada dinamicamente)
  percentualComissaoCalculado: number;
  valorComissaoCalculado: number;  // Empresa = base + over líquido
  comissaoPedido: number;
  
  // Comissão atribuída (salva no banco - vendedor/representante)
  comissaoAtribuida: number;
  
  // Flags
  temBoletos: boolean;
  entradaVerificada: boolean;
}

export function useSalesWithCalculations() {
  const { sales, installments, loading, refetch } = useOrganizationData();

  const salesWithCalculations = useMemo(() => {
    return sales.map((sale): SaleWithCalculations => {
      // 1. Buscar todas as parcelas da venda
      const saleInstallments = installments.filter(i => i.sale_id === sale.id);
      
      // 2. Usar valor_entrada salvo do banco quando disponível
      const valorEntradaSalvo = Number(sale.valor_entrada) || 0;
      const totalValue = Number(sale.total_value) || 0;
      const tableValue = Number(sale.table_value) || 0;
      
      // 3. Filtrar parcelas reais (excluindo a entrada se estiver nas installments)
      // A entrada pode estar salva como installment_number = 1
      const parcelasReais = saleInstallments.filter((inst) => {
        // Se o valor da parcela é igual ao valor_entrada, é a entrada
        if (valorEntradaSalvo > 0 && Math.abs(Number(inst.value) - valorEntradaSalvo) < 0.01) {
          return false; // Excluir - é a entrada
        }
        return true;
      });
      
      const somaParcelas = parcelasReais.reduce((acc, i) => acc + Number(i.value || 0), 0);
      const qtdParcelas = parcelasReais.length;
      
      // 4. Entrada: usar valor salvo OU calcular
      const entradaCalculada = valorEntradaSalvo > 0 
        ? valorEntradaSalvo 
        : totalValue - somaParcelas;
      
      // 5. Determinar tipo de pagamento
      const temBoletos = qtdParcelas > 0;
      const tipoPagamento = temBoletos ? 'parcelado_boleto' : 'a_vista';
      const taxaJuros = getTaxaJuros(tipoPagamento);
      
      // 6. Calcular Valor Presente
      const valorParcela = qtdParcelas > 0 ? somaParcelas / qtdParcelas : 0;
      const vpParcelas = calcularValorPresente(valorParcela, qtdParcelas, taxaJuros);
      const valorReal = entradaCalculada + vpParcelas;
      const jurosEmbutidos = somaParcelas - vpParcelas;
      
      // 7. Obter ICMS
      const icmsOrigem = 0.12; // Assumindo SP como origem
      const icmsDestino = getIcmsRate(sale.uf_destiny || 'SP');
      
      // 8. Comissão atribuída (salva no banco - para vendedor/representante)
      const comissaoAtribuida = Number(sale.commission_calculated) || 0;
      
      // 9. SEMPRE calcular comissão da empresa dinamicamente (nunca usar commission_calculated)
      const percentualComissaoBase = Number(sale.percentual_comissao) || 8;
      
      // Usar valores salvos do banco se disponíveis, senão calcular
      let overPriceBruto: number;
      let overPriceLiquido: number;
      let deducaoIcms: number;
      let deducaoPisCofins: number;
      let deducaoIrCsll: number;
      
      // Verificar se temos over_price salvo no banco
      const hasOverPriceSaved = sale.over_price !== null && sale.over_price !== undefined;
      
      if (hasOverPriceSaved) {
        // Usar valores salvos do banco
        overPriceBruto = Number(sale.over_price) || 0;
        overPriceLiquido = Number(sale.over_price_liquido) || 0;
        
        // Se as deduções estão zeradas mas temos over_price, recalcular as deduções
        const savedIcms = Number(sale.icms) || 0;
        const savedPisCofins = Number(sale.pis_cofins) || 0;
        const savedIrCsll = Number(sale.ir_csll) || 0;
        
        if (savedIcms === 0 && savedPisCofins === 0 && savedIrCsll === 0 && overPriceBruto > 0) {
          // Calcular deduções usando fórmula CASCATA (mesma da calculadora)
          // IMPORTANTE: percentual_icms é salvo como 4, 7 ou 12 (inteiro), converter para decimal
          const savedIcmsRate = Number(sale.percentual_icms) || 0;
          const icmsRateCalc = savedIcmsRate > 1 ? savedIcmsRate / 100 : (savedIcmsRate || icmsDestino || 0.12);
          
          // Fórmula cascata: cada dedução é sobre o subtotal anterior
          deducaoIcms = overPriceBruto * icmsRateCalc;
          const subtotalAposIcms = overPriceBruto - deducaoIcms;
          deducaoPisCofins = subtotalAposIcms * 0.0925;
          const subtotalAposPisCofins = subtotalAposIcms - deducaoPisCofins;
          deducaoIrCsll = subtotalAposPisCofins * 0.34;
        } else {
          deducaoIcms = savedIcms;
          deducaoPisCofins = savedPisCofins;
          deducaoIrCsll = savedIrCsll;
        }
      } else {
        // Recalcular usando approvalCalculator
        const calculo = calculateApprovalCommission({
          valorNF: valorReal,
          valorFaturado: totalValue,
          valorTabela: tableValue || valorReal * 0.9,
          percentualComissao: percentualComissaoBase,
          icmsOrigem,
          icmsDestino,
        });
        
        overPriceBruto = calculo.overPrice;
        overPriceLiquido = calculo.overLiquido;
        deducaoIcms = calculo.deducaoIcms;
        deducaoPisCofins = calculo.deducaoPisCofins;
        deducaoIrCsll = calculo.deducaoIrCsll;
      }
      
      // Comissão da empresa = base sobre tabela + over líquido
      const comissaoPedido = tableValue * (percentualComissaoBase / 100);
      const valorComissaoCalculado = comissaoPedido + overPriceLiquido;
      const percentualComissaoCalculado = totalValue > 0 ? (valorComissaoCalculado / totalValue) * 100 : 0;
      
      // 10. Verificar se entrada foi confirmada via boletos
      const entradaVerificada = temBoletos && entradaCalculada > 0;
      
      // Cast sale to SaleWithDetails since the types match
      const saleWithDetails = sale as unknown as SaleWithDetails;
      
      return {
        ...saleWithDetails,
        // Dados de parcelas
        installments: parcelasReais,
        somaParcelas,
        qtdParcelas,
        
        // Valores calculados
        entradaCalculada,
        valorReal,
        jurosEmbutidos,
        
        // Over Price
        overPriceBruto,
        overPriceLiquido,
        
        // Deduções
        deducaoIcms,
        deducaoPisCofins,
        deducaoIrCsll,
        
        // Comissão da empresa (calculada)
        percentualComissaoCalculado,
        valorComissaoCalculado,
        comissaoPedido,
        
        // Comissão atribuída (do banco - vendedor/rep)
        comissaoAtribuida,
        
        // Flags
        temBoletos,
        entradaVerificada,
      };
    });
  }, [sales, installments]);

  // Métricas agregadas
  const metrics = useMemo(() => {
    const totalVendas = salesWithCalculations.reduce((acc, s) => acc + (Number(s.total_value) || 0), 0);
    const totalComissoes = salesWithCalculations.reduce((acc, s) => acc + s.valorComissaoCalculado, 0);
    const totalOverLiquido = salesWithCalculations.reduce((acc, s) => acc + s.overPriceLiquido, 0);
    
    const vendasPorStatus = {
      pendente: salesWithCalculations.filter(s => s.status === 'pendente').length,
      aprovado: salesWithCalculations.filter(s => s.status === 'aprovado').length,
      pago: salesWithCalculations.filter(s => s.status === 'pago').length,
      rejeitado: salesWithCalculations.filter(s => s.status === 'rejeitado').length,
    };
    
    return {
      totalVendas,
      totalComissoes,
      totalOverLiquido,
      vendasPorStatus,
      qtdVendas: salesWithCalculations.length,
    };
  }, [salesWithCalculations]);

  return {
    sales: salesWithCalculations,
    metrics,
    loading,
    refetch,
  };
}
