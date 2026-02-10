import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency } from '@/lib/approvalCalculator';
import { cn } from '@/lib/utils';
import type { PendingSale } from '@/hooks/usePendingSales';

interface PendingSalesListProps {
  sales: PendingSale[];
  selectedSaleId: string | null;
  onSelectSale: (saleId: string) => void;
}

export function PendingSalesList({ sales, selectedSaleId, onSelectSale }: PendingSalesListProps) {
  if (sales.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Nenhuma venda pendente
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {sales.map((sale) => {
          const isActive = sale.id === selectedSaleId;
          return (
            <button
              key={sale.id}
              onClick={() => onSelectSale(sale.id)}
              className={cn(
                'w-full text-left rounded-lg p-3 transition-colors border',
                isActive
                  ? 'bg-primary/10 border-primary/30 shadow-sm'
                  : 'bg-transparent border-transparent hover:bg-muted/50'
              )}
            >
              <div className="flex justify-between items-start gap-2">
                <span className="font-mono text-sm font-medium truncate">
                  NFe {sale.nfe_number || '-'}
                </span>
                <span className="text-sm font-semibold text-primary whitespace-nowrap">
                  {formatCurrency(sale.total_value || 0)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {sale.client_name || 'Cliente não informado'}
              </p>
              {sale.uf_destiny && (
                <span className="text-xs text-muted-foreground">UF: {sale.uf_destiny}</span>
              )}
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
