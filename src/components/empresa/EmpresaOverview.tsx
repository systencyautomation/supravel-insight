import { useState, useMemo } from 'react';
import { KPICard } from '@/components/dashboard/KPICard';
import { SalesAreaChart } from '@/components/dashboard/SalesAreaChart';
import { ProductMixChart } from '@/components/dashboard/ProductMixChart';
import { ForecastChart } from '@/components/dashboard/ForecastChart';
import { DateRangeFilter, DateRange } from '@/components/dashboard/DateRangeFilter';
import { DashboardFilters, DashboardFilterValues } from '@/components/dashboard/DashboardFilters';
import { CommandBar } from '@/components/dashboard/CommandBar';
import { SkeletonDashboard } from '@/components/dashboard/SkeletonDashboard';
import { CommissionReceivableCard } from '@/components/dashboard/CommissionReceivableCard';
import { TrendingUp, Percent, HeartPulse } from 'lucide-react';
import { SaleWithDetails, useSalesMetrics } from '@/hooks/useSalesMetrics';
import { SaleWithCalculations } from '@/hooks/useSalesWithCalculations';
import { isWithinInterval, parseISO } from 'date-fns';

interface EmpresaOverviewProps {
  salesWithDetails: SaleWithDetails[];
  salesWithCalculations: SaleWithCalculations[];
  metrics: ReturnType<typeof useSalesMetrics>;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  loading: boolean;
}

const emptyFilters: DashboardFilterValues = {
  clients: new Set(),
  products: new Set(),
  statuses: new Set(),
};

export function EmpresaOverview({
  salesWithDetails,
  salesWithCalculations,
  metrics,
  dateRange,
  onDateRangeChange,
  loading,
}: EmpresaOverviewProps) {
  const [filters, setFilters] = useState<DashboardFilterValues>(emptyFilters);

  // Apply date range + advanced filters
  const filteredSales = useMemo(() => {
    return salesWithDetails.filter((sale) => {
      // Date range
      if (sale.emission_date) {
        const saleDate = parseISO(sale.emission_date);
        if (!isWithinInterval(saleDate, { start: dateRange.start, end: dateRange.end })) {
          return false;
        }
      }
      // Client filter
      if (filters.clients.size > 0 && (!sale.client_name || !filters.clients.has(sale.client_name))) {
        return false;
      }
      // Product filter
      if (filters.products.size > 0 && (!sale.produto_modelo || !filters.products.has(sale.produto_modelo))) {
        return false;
      }
      // Status filter
      if (filters.statuses.size > 0 && (!sale.status || !filters.statuses.has(sale.status))) {
        return false;
      }
      return true;
    });
  }, [salesWithDetails, dateRange, filters]);

  const filteredCalcSales = useMemo(() => {
    const filteredIds = new Set(filteredSales.map((s) => s.id));
    return salesWithCalculations.filter((s) => filteredIds.has(s.id));
  }, [salesWithCalculations, filteredSales]);

  // Recalculate metrics for filtered data
  const filteredMetrics = useSalesMetrics(filteredSales, { start: dateRange.start, end: dateRange.end });

  if (loading) {
    return <SkeletonDashboard />;
  }

  return (
    <div className="space-y-6">
      {/* Filters Row */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <DateRangeFilter value={dateRange} onChange={onDateRangeChange} />
          <CommandBar sales={salesWithDetails} />
        </div>
        <DashboardFilters
          sales={salesWithDetails}
          filters={filters}
          onChange={setFilters}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Vendas Brutas"
          value={filteredMetrics.vendasBrutas}
          format="currency"
          subtitle={`${filteredMetrics.totalVendas} NF-e processadas`}
          trend={{ value: filteredMetrics.vendasBrutasTrend, label: 'vs mês anterior' }}
          icon={TrendingUp}
          variant="primary"
          delay={0}
        />
        <CommissionReceivableCard
          sales={filteredCalcSales}
          delay={100}
        />
        <KPICard
          title="Margem Over Price"
          value={filteredMetrics.margemOverPrice}
          format="percent"
          subtitle="Média do período"
          icon={Percent}
          variant="warning"
          delay={200}
        />
        <KPICard
          title="Saúde Recebimento"
          value={filteredMetrics.saudeRecebimento}
          format="percent"
          subtitle={`${filteredMetrics.vendasPagas}/${filteredMetrics.totalVendas} pagas`}
          icon={HeartPulse}
          delay={300}
        />
      </div>

      {/* Forecast Chart - Full Width */}
      <ForecastChart sales={salesWithCalculations} className="w-full" />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SalesAreaChart sales={filteredSales} className="lg:col-span-2" />
        <ProductMixChart sales={filteredSales} />
      </div>
    </div>
  );
}
