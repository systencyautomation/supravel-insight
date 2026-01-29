import { useState, useMemo } from 'react';
import { KPICard } from '@/components/dashboard/KPICard';
import { SalesAreaChart } from '@/components/dashboard/SalesAreaChart';
import { ProductMixChart } from '@/components/dashboard/ProductMixChart';
import { DateRangeFilter, DateRange } from '@/components/dashboard/DateRangeFilter';
import { CommandBar } from '@/components/dashboard/CommandBar';
import { SkeletonDashboard } from '@/components/dashboard/SkeletonDashboard';
import { AdvancedFilters, ValueFilters } from '@/components/dashboard/AdvancedFilters';
import { TrendingUp, DollarSign, Percent, HeartPulse } from 'lucide-react';
import { SaleWithDetails, SalesMetrics, useSalesMetrics } from '@/hooks/useSalesMetrics';

interface EmpresaOverviewProps {
  salesWithDetails: SaleWithDetails[];
  metrics: SalesMetrics;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  loading: boolean;
}

export function EmpresaOverview({
  salesWithDetails,
  metrics: baseMetrics,
  dateRange,
  onDateRangeChange,
  loading,
}: EmpresaOverviewProps) {
  // Value filters state
  const [valueFilters, setValueFilters] = useState<ValueFilters>({
    faturamento: [0, Infinity],
    comissaoEmpresa: [0, Infinity],
    overLiquido: [0, Infinity],
    comissaoVendedor: [0, Infinity],
  });

  // Apply value filters to sales
  const filteredSales = useMemo(() => {
    return salesWithDetails.filter(sale => {
      const faturamento = sale.total_value || 0;
      const tableValue = sale.table_value || 0;
      const percentComissao = sale.percentual_comissao || 0;
      const overLiquido = Math.max(0, sale.over_price_liquido || 0);
      const comissaoEmpresa = (tableValue * percentComissao / 100) + overLiquido;
      const comissaoVendedor = sale.commission_calculated || 0;

      // Apply filters
      if (faturamento < valueFilters.faturamento[0] || faturamento > valueFilters.faturamento[1]) return false;
      if (comissaoEmpresa < valueFilters.comissaoEmpresa[0] || comissaoEmpresa > valueFilters.comissaoEmpresa[1]) return false;
      if (overLiquido < valueFilters.overLiquido[0] || overLiquido > valueFilters.overLiquido[1]) return false;
      if (comissaoVendedor < valueFilters.comissaoVendedor[0] || comissaoVendedor > valueFilters.comissaoVendedor[1]) return false;

      return true;
    });
  }, [salesWithDetails, valueFilters]);

  // Recalculate metrics with filtered sales
  const metrics = useSalesMetrics(filteredSales, { start: dateRange.start, end: dateRange.end });

  if (loading) {
    return <SkeletonDashboard />;
  }

  return (
    <div className="space-y-6">
      {/* Filters Row */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <DateRangeFilter value={dateRange} onChange={onDateRangeChange} />
          <CommandBar sales={filteredSales} />
        </div>
        
        {/* Advanced Filters */}
        <AdvancedFilters
          sales={salesWithDetails}
          filters={valueFilters}
          onFiltersChange={setValueFilters}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Vendas Brutas"
          value={metrics.vendasBrutas}
          format="currency"
          subtitle={`${metrics.totalVendas} NF-e processadas`}
          trend={{ value: metrics.vendasBrutasTrend, label: 'vs mês anterior' }}
          icon={TrendingUp}
          variant="primary"
          delay={0}
        />
        <KPICard
          title="Comissões a Pagar"
          value={metrics.comissoesAPagar}
          format="currency"
          subtitle="Over + Base"
          icon={DollarSign}
          variant="success"
          delay={100}
        />
        <KPICard
          title="Margem Over Price"
          value={metrics.margemOverPrice}
          format="percent"
          subtitle="Média do período"
          icon={Percent}
          variant="warning"
          delay={200}
        />
        <KPICard
          title="Saúde Recebimento"
          value={metrics.saudeRecebimento}
          format="percent"
          subtitle={`${metrics.vendasPagas}/${metrics.totalVendas} pagas`}
          icon={HeartPulse}
          delay={300}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SalesAreaChart sales={filteredSales} className="lg:col-span-2" />
        <ProductMixChart sales={filteredSales} />
      </div>
    </div>
  );
}
