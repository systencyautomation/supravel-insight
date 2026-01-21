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
      // 1. Agrupar installments da venda
      const saleInstallments = installments.filter(i => i.sale_id === sale.id);
      const somaParcelas = saleInstallments.reduce((acc, i) => acc + Number(i.value || 0), 0);
      const qtdParcelas = saleInstallments.length;
      
      // 2. Calcular entrada: Total NF - Soma das parcelas
      const totalValue = Number(sale.total_value) || 0;
      const tableValue = Number(sale.table_value) || 0;
      const entradaCalculada = totalValue - somaParcelas;
      
      // 3. Determinar tipo de pagamento
      const temBoletos = qtdParcelas > 0;
      const tipoPagamento = temBoletos ? 'parcelado_boleto' : 'a_vista';
      const taxaJuros = getTaxaJuros(tipoPagamento);
      
      // 4. Calcular Valor Presente
      const valorParcela = qtdParcelas > 0 ? somaParcelas / qtdParcelas : 0;
      const vpParcelas = calcularValorPresente(valorParcela, qtdParcelas, taxaJuros);
      const valorReal = entradaCalculada + vpParcelas;
      const jurosEmbutidos = somaParcelas - vpParcelas;
      
      // 5. Obter ICMS
      const icmsOrigem = 0.12; // Assumindo SP como origem
      const icmsDestino = getIcmsRate(sale.uf_destiny || 'SP');
      
      // 6. Calcular comissão usando approvalCalculator
      const percentualComissaoBase = Number(sale.percentual_comissao) || 3; // Default 3%
      
      const calculo = calculateApprovalCommission({
        valorNF: valorReal,
        valorFaturado: totalValue,
        valorTabela: tableValue || valorReal * 0.9, // Fallback: 90% do valor real
        percentualComissao: percentualComissaoBase,
        icmsOrigem,
        icmsDestino,
      });
      
      // 7. Verificar se entrada foi confirmada via boletos
      const entradaVerificada = temBoletos && entradaCalculada > 0;
      
      // Cast sale to SaleWithDetails since the types match
      const saleWithDetails = sale as unknown as SaleWithDetails;
      
      return {
        ...saleWithDetails,
        // Dados de parcelas
        installments: saleInstallments,
        somaParcelas,
        qtdParcelas,
        
        // Valores calculados
        entradaCalculada,
        valorReal,
        jurosEmbutidos,
        
        // Over Price
        overPriceBruto: calculo.overPrice,
        overPriceLiquido: calculo.overLiquido,
        
        // Deduções
        deducaoIcms: calculo.deducaoIcms,
        deducaoPisCofins: calculo.deducaoPisCofins,
        deducaoIrCsll: calculo.deducaoIrCsll,
        
        // Comissão
        percentualComissaoCalculado: calculo.percentualFinal,
        valorComissaoCalculado: calculo.comissaoTotal,
        comissaoPedido: calculo.comissaoPedido,
        
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
