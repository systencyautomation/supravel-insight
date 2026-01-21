import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { formatCurrency } from '@/lib/utils';
import { SaleWithDetails } from '@/hooks/useSalesMetrics';

interface SalesAreaChartProps {
  sales: SaleWithDetails[];
  className?: string;
}

const chartConfig = {
  vendas: {
    label: "Vendas",
    color: "hsl(var(--primary))",
  },
  comissoes: {
    label: "Comissões",
    color: "hsl(var(--success))",
  },
};

export function SalesAreaChart({ sales, className }: SalesAreaChartProps) {
  const chartData = useMemo(() => {
    // Group sales by date
    const grouped = sales.reduce((acc, sale) => {
      if (!sale.emission_date) return acc;
      
      const date = sale.emission_date;
      if (!acc[date]) {
        acc[date] = { vendas: 0, comissoes: 0 };
      }
      acc[date].vendas += sale.total_value || 0;
      acc[date].comissoes += (sale.over_price_liquido || 0) + (sale.commission_calculated || 0);
      return acc;
    }, {} as Record<string, { vendas: number; comissoes: number }>);

    // Convert to array and sort by date
    return Object.entries(grouped)
      .map(([date, data]) => ({
        date,
        dateFormatted: format(parseISO(date), 'dd MMM', { locale: ptBR }),
        vendas: data.vendas,
        comissoes: data.comissoes,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14); // Last 14 data points
  }, [sales]);

  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Vendas vs Comissões</CardTitle>
          <CardDescription>Evolução temporal</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[280px]">
          <p className="text-muted-foreground">Sem dados para exibir</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Vendas vs Comissões</CardTitle>
        <CardDescription>Evolução temporal • Últimos 14 registros</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillVendas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillComissoes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
              <XAxis 
                dataKey="dateFormatted" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                dx={-10}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value, name) => (
                      <span className="font-medium">
                        {formatCurrency(value as number)}
                      </span>
                    )}
                  />
                } 
              />
              <Area
                type="monotone"
                dataKey="vendas"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#fillVendas)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="comissoes"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                fill="url(#fillComissoes)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
