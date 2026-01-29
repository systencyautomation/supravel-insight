import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AnimatedNumber } from './AnimatedNumber';
import { cn } from '@/lib/utils';
import { SaleWithCalculations } from '@/hooks/useSalesWithCalculations';
import { DateRange } from 'react-day-picker';

interface CommissionReceivableCardProps {
  sales: SaleWithCalculations[];
  delay?: number;
}

export function CommissionReceivableCard({ sales, delay = 0 }: CommissionReceivableCardProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Calculate pending commission from installments
  const { totalCommission, totalPending, count } = useMemo(() => {
    let commission = 0;
    let pending = 0;
    let itemCount = 0;

    sales.forEach((sale) => {
      // Only process approved or paid sales
      if (sale.status !== 'aprovado' && sale.status !== 'pago') return;

      const percentualComissao = sale.percentualComissaoCalculado || 0;

      // Process entry (entrada)
      const valorEntrada = Number(sale.valor_entrada) || sale.entradaCalculada || 0;
      if (valorEntrada > 0 && sale.status !== 'pago') {
        const entryDate = new Date(sale.emission_date || sale.created_at || new Date());
        
        // Check if entry is within date range
        const inRange = !dateRange?.from || !dateRange?.to || 
          (entryDate >= dateRange.from && entryDate <= dateRange.to);
        
        if (inRange) {
          const comissaoEntrada = valorEntrada * (percentualComissao / 100);
          commission += comissaoEntrada;
          pending += valorEntrada;
          itemCount++;
        }
      }

      // Process installments
      if (sale.installments && sale.installments.length > 0) {
        sale.installments.forEach((inst) => {
          if (inst.status === 'pago') return;
          
          const dueDate = new Date(inst.due_date || sale.emission_date || new Date());
          
          // Check if installment is within date range
          const inRange = !dateRange?.from || !dateRange?.to || 
            (dueDate >= dateRange.from && dueDate <= dateRange.to);
          
          if (inRange) {
            const valorParcela = Number(inst.value) || 0;
            const comissaoParcela = valorParcela * (percentualComissao / 100);
            commission += comissaoParcela;
            pending += valorParcela;
            itemCount++;
          }
        });
      }
    });

    return { totalCommission: commission, totalPending: pending, count: itemCount };
  }, [sales, dateRange]);

  const formatDateLabel = () => {
    if (!dateRange?.from) return 'Todo período';
    if (!dateRange?.to) return format(dateRange.from, 'dd MMM yyyy', { locale: ptBR });
    return `${format(dateRange.from, 'dd MMM', { locale: ptBR })} - ${format(dateRange.to, 'dd MMM yyyy', { locale: ptBR })}`;
  };

  const clearFilter = () => setDateRange(undefined);

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
        "shadow-lg shadow-success/5",
        "animate-fade-in"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Comissões a Receber
              </p>
              
              {/* Date Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={dateRange?.from ? 'secondary' : 'ghost'}
                    size="sm"
                    className={cn(
                      "h-7 px-2 text-xs gap-1.5",
                      dateRange?.from && "bg-success/10 text-success hover:bg-success/20"
                    )}
                  >
                    <Calendar className="h-3 w-3" />
                    <span className="hidden sm:inline">{formatDateLabel()}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-2 border-b border-border">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Filtrar por vencimento
                      </span>
                      {dateRange?.from && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilter}
                          className="h-6 px-2 text-xs"
                        >
                          Limpar
                        </Button>
                      )}
                    </div>
                  </div>
                  <CalendarComponent
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="text-3xl font-bold tracking-tight">
              <AnimatedNumber 
                value={totalCommission} 
                format="currency"
                delay={delay + 200}
                duration={1200}
              />
            </div>
            
            <p className="text-sm text-muted-foreground">
              {count} {count === 1 ? 'parcela pendente' : 'parcelas pendentes'}
            </p>
          </div>
          
          <div className={cn(
            "p-3 rounded-xl transition-transform duration-300 hover:scale-110",
            "bg-success/10"
          )}>
            <Wallet className="h-5 w-5 text-success" />
          </div>
        </div>

        {/* Secondary metric - total pending from clients */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Pendente (cliente)</span>
            <span className="font-mono font-medium">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPending)}
            </span>
          </div>
        </div>
      </CardContent>

      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-success/[0.02] pointer-events-none" />
    </Card>
  );
}
