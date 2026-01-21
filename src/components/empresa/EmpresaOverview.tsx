import { KPICard } from '@/components/dashboard/KPICard';
import { SalesAreaChart } from '@/components/dashboard/SalesAreaChart';
import { ProductMixChart } from '@/components/dashboard/ProductMixChart';
import { SalesListTable } from '@/components/vendas/SalesListTable';
import { DateRangeFilter, DateRange } from '@/components/dashboard/DateRangeFilter';
import { CommandBar } from '@/components/dashboard/CommandBar';
import { SkeletonDashboard } from '@/components/dashboard/SkeletonDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, Percent, HeartPulse } from 'lucide-react';
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
        <SalesAreaChart sales={salesWithDetails} className="lg:col-span-2" />
        <ProductMixChart sales={salesWithDetails} />
      </div>

      {/* Sales DataTable */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Vendas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <SalesListTable sales={salesWithCalculations} loading={loading} />
        </CardContent>
      </Card>
    </div>
  );
}
