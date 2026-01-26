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
  
  // Comissão
  percentualComissaoCalculado: number;
  valorComissaoCalculado: number;
  comissaoPedido: number;
  
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
      
      // 8. Verificar se tem comissão já calculada/aprovada no banco
      const comissaoSalva = Number(sale.commission_calculated) || 0;
      
      // 9. Calcular comissão ou usar valor salvo
      let percentualComissaoCalculado: number;
      let valorComissaoCalculado: number;
      let comissaoPedido: number;
      let overPriceBruto: number;
      let overPriceLiquido: number;
      let deducaoIcms: number;
      let deducaoPisCofins: number;
      let deducaoIrCsll: number;
      
      if (comissaoSalva > 0) {
        // Venda já processada - usar valores salvos
        valorComissaoCalculado = comissaoSalva;
        percentualComissaoCalculado = totalValue > 0 ? (comissaoSalva / totalValue) * 100 : 0;
        
        // Usar valores salvos do banco se disponíveis
        overPriceBruto = Number(sale.over_price) || 0;
        overPriceLiquido = Number(sale.over_price_liquido) || 0;
        deducaoIcms = Number(sale.icms) || 0;
        deducaoPisCofins = Number(sale.pis_cofins) || 0;
        deducaoIrCsll = Number(sale.ir_csll) || 0;
        
        // Calcular comissão do pedido baseado nos valores
        const percentualComissaoBase = Number(sale.percentual_comissao) || 8;
        comissaoPedido = tableValue * (percentualComissaoBase / 100);
      } else {
        // Recalcular usando approvalCalculator
        const percentualComissaoBase = Number(sale.percentual_comissao) || 3;
        
        const calculo = calculateApprovalCommission({
          valorNF: valorReal,
          valorFaturado: totalValue,
          valorTabela: tableValue || valorReal * 0.9,
          percentualComissao: percentualComissaoBase,
          icmsOrigem,
          icmsDestino,
        });
        
        percentualComissaoCalculado = calculo.percentualFinal;
        valorComissaoCalculado = calculo.comissaoTotal;
        comissaoPedido = calculo.comissaoPedido;
        overPriceBruto = calculo.overPrice;
        overPriceLiquido = calculo.overLiquido;
        deducaoIcms = calculo.deducaoIcms;
        deducaoPisCofins = calculo.deducaoPisCofins;
        deducaoIrCsll = calculo.deducaoIrCsll;
      }
      
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
        
        // Comissão
        percentualComissaoCalculado,
        valorComissaoCalculado,
        comissaoPedido,
        
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
