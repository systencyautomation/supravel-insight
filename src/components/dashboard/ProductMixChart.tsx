import { useMemo } from 'react';
import { Pie, PieChart, Cell, ResponsiveContainer, Label } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { formatCurrency } from '@/lib/utils';
import { SaleWithDetails } from '@/hooks/useSalesMetrics';

interface ProductMixChartProps {
  sales: SaleWithDetails[];
  className?: string;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--secondary))',
  'hsl(var(--muted-foreground))',
];

export function ProductMixChart({ sales, className }: ProductMixChartProps) {
  const { chartData, totalValue, chartConfig } = useMemo(() => {
    // Group sales by product
    const grouped = sales.reduce((acc, sale) => {
      const productName = sale.produto_modelo || sale.produto_marca || 'Outros';
      if (!acc[productName]) {
        acc[productName] = { value: 0, count: 0 };
      }
      acc[productName].value += sale.total_value || 0;
      acc[productName].count += 1;
      return acc;
    }, {} as Record<string, { value: number; count: number }>);

    // Convert to array, sort by value, and take top 5
    const sortedData = Object.entries(grouped)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value);

    // Take top 4 and group rest as "Outros"
    let finalData = sortedData.slice(0, 4);
    const otherData = sortedData.slice(4);
    
    if (otherData.length > 0) {
      const otherTotal = otherData.reduce((acc, item) => ({
        value: acc.value + item.value,
        count: acc.count + item.count,
      }), { value: 0, count: 0 });
      
      finalData.push({ name: 'Outros', ...otherTotal });
    }

    const total = finalData.reduce((acc, item) => acc + item.value, 0);

    // Create chart config dynamically
    const config = finalData.reduce((acc, item, index) => {
      acc[item.name] = {
        label: item.name,
        color: COLORS[index % COLORS.length],
      };
      return acc;
    }, {} as Record<string, { label: string; color: string }>);

    return {
      chartData: finalData.map((item, index) => ({
        ...item,
        fill: COLORS[index % COLORS.length],
        percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : 0,
      })),
      totalValue: total,
      chartConfig: config,
    };
  }, [sales]);

  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Mix de Produtos</CardTitle>
          <CardDescription>Distribuição por modelo</CardDescription>
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
        <CardTitle className="text-lg font-semibold">Mix de Produtos</CardTitle>
        <CardDescription>Distribuição por modelo</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name, props) => (
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{formatCurrency(value as number)}</span>
                        <span className="text-xs text-muted-foreground">
                          {props.payload.count} vendas • {props.payload.percentage}%
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                strokeWidth={2}
                stroke="hsl(var(--background))"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) - 8}
                            className="fill-foreground text-xl font-bold"
                          >
                            {chartData.length}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 10}
                            className="fill-muted-foreground text-xs"
                          >
                            produtos
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mt-4">
          {chartData.map((item, index) => (
            <div key={item.name} className="flex items-center gap-1.5 text-xs">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-muted-foreground truncate max-w-[80px]" title={item.name}>
                {item.name}
              </span>
              <span className="font-medium">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
