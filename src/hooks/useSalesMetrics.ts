import { useMemo } from 'react';

// Extended Sale type with all fields from database
export interface SaleWithDetails {
  id: string;
  client_name: string | null;
  client_cnpj: string | null;
  nfe_number: string | null;
  total_value: number | null;
  table_value: number | null;
  uf_destiny: string | null;
  payment_method: string | null;
  status: string | null;
  over_price: number | null;
  over_price_liquido: number | null;
  pis_cofins: number | null;
  ir_csll: number | null;
  icms: number | null;
  commission_calculated: number | null;
  internal_seller_id: string | null;
  internal_seller_percent: number | null;
  representative_id: string | null;
  representative_percent: number | null;
  emission_date: string | null;
  created_at: string | null;
  produto_modelo: string | null;
  produto_descricao: string | null;
  produto_marca: string | null;
  produto_codigo: string | null;
  produto_numero_serie: string | null;
  percentual_comissao: number | null;
  percentual_icms: number | null;
  valor_entrada: number | null;
  observacoes: string | null;
  motivo_rejeicao: string | null;
  aprovado_por: string | null;
  aprovado_em: string | null;
}
import { startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from 'date-fns';

export interface SalesMetrics {
  vendasBrutas: number;
  vendasBrutasAnterior: number;
  vendasBrutasTrend: number;
  comissoesAPagar: number;
  margemOverPrice: number;
  saudeRecebimento: number;
  totalVendas: number;
  vendasPagas: number;
  vendasPendentes: number;
  productMix: { name: string; value: number; count: number }[];
  dailyData: { date: string; vendas: number; comissoes: number }[];
}

export function useSalesMetrics(sales: SaleWithDetails[], dateRange?: { start: Date; end: Date }): SalesMetrics {
  return useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const previousMonthStart = startOfMonth(subMonths(now, 1));
    const previousMonthEnd = endOfMonth(subMonths(now, 1));

    // Filter by date range if provided
    const filteredSales = dateRange
      ? sales.filter(sale => {
          if (!sale.emission_date) return false;
          const saleDate = parseISO(sale.emission_date);
          return isWithinInterval(saleDate, { start: dateRange.start, end: dateRange.end });
        })
      : sales;

    // Current month sales
    const currentMonthSales = sales.filter(sale => {
      if (!sale.emission_date) return false;
      const saleDate = parseISO(sale.emission_date);
      return isWithinInterval(saleDate, { start: currentMonthStart, end: currentMonthEnd });
    });

    // Previous month sales for trend comparison
    const previousMonthSales = sales.filter(sale => {
      if (!sale.emission_date) return false;
      const saleDate = parseISO(sale.emission_date);
      return isWithinInterval(saleDate, { start: previousMonthStart, end: previousMonthEnd });
    });

    // Vendas Brutas (Mês Atual)
    const vendasBrutas = currentMonthSales.reduce((acc, sale) => acc + (sale.total_value || 0), 0);
    const vendasBrutasAnterior = previousMonthSales.reduce((acc, sale) => acc + (sale.total_value || 0), 0);
    const vendasBrutasTrend = vendasBrutasAnterior > 0 
      ? ((vendasBrutas - vendasBrutasAnterior) / vendasBrutasAnterior) * 100 
      : 0;

    // Comissões a Pagar (Over Líquido + Comissão Base)
    const comissoesAPagar = filteredSales.reduce((acc, sale) => {
      const overLiquido = sale.over_price_liquido || 0;
      const comissaoBase = sale.commission_calculated || 0;
      return acc + overLiquido + comissaoBase;
    }, 0);

    // Margem Over Price (% médio)
    const salesWithOver = filteredSales.filter(s => s.total_value && s.table_value && s.table_value > 0);
    const margemOverPrice = salesWithOver.length > 0
      ? salesWithOver.reduce((acc, sale) => {
          const margem = ((sale.total_value! - sale.table_value!) / sale.table_value!) * 100;
          return acc + margem;
        }, 0) / salesWithOver.length
      : 0;

    // Saúde do Recebimento
    const totalVendas = filteredSales.length;
    const vendasPagas = filteredSales.filter(s => s.status === 'pago' || s.status === 'aprovado').length;
    const vendasPendentes = filteredSales.filter(s => s.status === 'pendente').length;
    const saudeRecebimento = totalVendas > 0 ? (vendasPagas / totalVendas) * 100 : 0;

    // Product Mix
    const productGroups = filteredSales.reduce((acc, sale) => {
      const productName = sale.produto_modelo || sale.produto_descricao || 'Outros';
      if (!acc[productName]) {
        acc[productName] = { value: 0, count: 0 };
      }
      acc[productName].value += sale.total_value || 0;
      acc[productName].count += 1;
      return acc;
    }, {} as Record<string, { value: number; count: number }>);

    const productMix = Object.entries(productGroups)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Daily data for area chart
    const dailyGroups = filteredSales.reduce((acc, sale) => {
      const date = sale.emission_date || 'Sem data';
      if (!acc[date]) {
        acc[date] = { vendas: 0, comissoes: 0 };
      }
      acc[date].vendas += sale.total_value || 0;
      acc[date].comissoes += (sale.over_price_liquido || 0) + (sale.commission_calculated || 0);
      return acc;
    }, {} as Record<string, { vendas: number; comissoes: number }>);

    const dailyData = Object.entries(dailyGroups)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      vendasBrutas,
      vendasBrutasAnterior,
      vendasBrutasTrend,
      comissoesAPagar,
      margemOverPrice,
      saudeRecebimento,
      totalVendas,
      vendasPagas,
      vendasPendentes,
      productMix,
      dailyData,
    };
  }, [sales, dateRange]);
}
