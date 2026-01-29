import { KPICard } from '@/components/dashboard/KPICard';
import { SalesAreaChart } from '@/components/dashboard/SalesAreaChart';
import { ProductMixChart } from '@/components/dashboard/ProductMixChart';
import { DateRangeFilter, DateRange } from '@/components/dashboard/DateRangeFilter';
import { CommandBar } from '@/components/dashboard/CommandBar';
import { SkeletonDashboard } from '@/components/dashboard/SkeletonDashboard';
import { CommissionReceivableCard } from '@/components/dashboard/CommissionReceivableCard';
import { TrendingUp, Percent, HeartPulse } from 'lucide-react';
import { SaleWithDetails, SalesMetrics } from '@/hooks/useSalesMetrics';
import { SaleWithCalculations } from '@/hooks/useSalesWithCalculations';

interface EmpresaOverviewProps {
  salesWithDetails: SaleWithDetails[];
  salesWithCalculations: SaleWithCalculations[];
  metrics: SalesMetrics;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  loading: boolean;
}

export function EmpresaOverview({
  salesWithDetails,
  salesWithCalculations,
  metrics,
  dateRange,
  onDateRangeChange,
  loading,
}: EmpresaOverviewProps) {
  if (loading) {
    return <SkeletonDashboard />;
  }

  return (
    <div className="space-y-6">
      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <DateRangeFilter value={dateRange} onChange={onDateRangeChange} />
        <CommandBar sales={salesWithDetails} />
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
        <CommissionReceivableCard
          sales={salesWithCalculations}
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
        <SalesAreaChart sales={salesWithDetails} className="lg:col-span-2" />
        <ProductMixChart sales={salesWithDetails} />
      </div>
    </div>
  );
}
