import { useMemo } from 'react';
import { format, addMonths, startOfMonth, endOfMonth, parseISO, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { formatCurrency } from '@/lib/utils';
import { SaleWithCalculations } from '@/hooks/useSalesWithCalculations';

interface ForecastChartProps {
  sales: SaleWithCalculations[];
  className?: string;
}

const chartConfig = {
  recebido: {
    label: 'Recebido',
    color: 'hsl(var(--primary))',
  },
  previsto: {
    label: 'Previsto',
    color: 'hsl(var(--primary) / 0.4)',
  },
};

export function ForecastChart({ sales, className }: ForecastChartProps) {
  const chartData = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);

    // Build 12 months: 3 past + current + 8 future
    const months: { start: Date; end: Date; label: string; key: string; isPast: boolean }[] = [];
    for (let i = -3; i <= 8; i++) {
      const monthDate = addMonths(currentMonthStart, i);
      months.push({
        start: startOfMonth(monthDate),
        end: endOfMonth(monthDate),
        label: format(monthDate, 'MMM yy', { locale: ptBR }),
        key: format(monthDate, 'yyyy-MM'),
        isPast: i < 0 || (i === 0),
      });
    }

    // Collect all installments from approved/paid sales
    const monthlyData: Record<string, { recebido: number; previsto: number }> = {};
    months.forEach((m) => {
      monthlyData[m.key] = { recebido: 0, previsto: 0 };
    });

    sales.forEach((sale) => {
      if (sale.status !== 'aprovado' && sale.status !== 'pago') return;

      // Process installments
      if (sale.installments && sale.installments.length > 0) {
        sale.installments.forEach((inst) => {
          if (!inst.due_date) return;
          const dueDate = parseISO(inst.due_date);
          const monthKey = format(dueDate, 'yyyy-MM');
          const valor = Number(inst.value) || 0;

          if (monthlyData[monthKey] !== undefined) {
            if (inst.status === 'pago' || inst.paid_at) {
              monthlyData[monthKey].recebido += valor;
            } else {
              // Past due but not paid = still previsto (overdue)
              // Future = previsto
              if (isBefore(dueDate, now) && !inst.paid_at) {
                monthlyData[monthKey].previsto += valor;
              } else {
                monthlyData[monthKey].previsto += valor;
              }
            }
          }
        });
      }

      // Process entry value for the emission month
      const entradaValor = Number(sale.valor_entrada) || sale.entradaCalculada || 0;
      if (entradaValor > 0 && sale.emission_date) {
        const emissionKey = format(parseISO(sale.emission_date), 'yyyy-MM');
        if (monthlyData[emissionKey] !== undefined) {
          if (sale.status === 'pago') {
            monthlyData[emissionKey].recebido += entradaValor;
          } else {
            monthlyData[emissionKey].previsto += entradaValor;
          }
        }
      }
    });

    return months.map((m) => ({
      month: m.label,
      key: m.key,
      isPast: m.isPast,
      recebido: monthlyData[m.key]?.recebido || 0,
      previsto: monthlyData[m.key]?.previsto || 0,
      total: (monthlyData[m.key]?.recebido || 0) + (monthlyData[m.key]?.previsto || 0),
    }));
  }, [sales]);

  const totalPrevisto = chartData.reduce((acc, d) => acc + d.previsto, 0);
  const totalRecebido = chartData.reduce((acc, d) => acc + d.recebido, 0);

  if (chartData.every((d) => d.total === 0)) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Forecast de Recebimentos</CardTitle>
          <CardDescription>Projeção 12 meses</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[320px]">
          <p className="text-muted-foreground">Sem parcelas para projetar</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Forecast de Recebimentos</CardTitle>
            <CardDescription>Projeção baseada em parcelas aprovadas • 12 meses</CardDescription>
          </div>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
              <span className="text-muted-foreground">Recebido</span>
              <span className="font-mono font-medium">{formatCurrency(totalRecebido)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-primary/40" />
              <span className="text-muted-foreground">Previsto</span>
              <span className="font-mono font-medium">{formatCurrency(totalPrevisto)}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
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
                      <span className="font-medium">{formatCurrency(value as number)}</span>
                    )}
                  />
                }
              />
              <Bar dataKey="recebido" stackId="a" radius={[0, 0, 0, 0]} fill="hsl(var(--primary))" />
              <Bar dataKey="previsto" stackId="a" radius={[4, 4, 0, 0]} fill="hsl(var(--primary) / 0.35)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
