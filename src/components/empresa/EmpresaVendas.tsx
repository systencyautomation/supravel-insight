import { SalesListTable } from '@/components/vendas/SalesListTable';
import { SaleWithCalculations } from '@/hooks/useSalesWithCalculations';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download } from 'lucide-react';

interface EmpresaVendasProps {
  sales: SaleWithCalculations[];
  loading: boolean;
  onRefresh: () => void;
}

export function EmpresaVendas({ sales, loading, onRefresh }: EmpresaVendasProps) {
  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Vendas</h2>
          <p className="text-sm text-muted-foreground">
            Visualize e filtre todas as vendas da empresa
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Sales table with filters */}
      <SalesListTable sales={sales} loading={loading} />
    </div>
  );
}
