import { Sale } from '@/types/commission';
import { calculateCommission } from '@/types/commission';
import { SummaryCard } from '@/components/SummaryCard';
import { formatCurrency } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';

interface InternalSellerCommissionsProps {
  sales: Sale[];
}

export function InternalSellerCommissions({ sales }: InternalSellerCommissionsProps) {
  // Internal sellers get 30% of the net commission as bonus
  const BONUS_PERCENTAGE = 0.30;

  // Get unique sellers from sales data
  const vendedoresInternos = [...new Set(sales.map(s => s.vendedorInterno).filter(Boolean))];

  const sellerData = vendedoresInternos.map(vendedor => {
    const vendorSales = sales.filter(s => s.vendedorInterno === vendedor);
    const totalBonus = vendorSales.reduce((acc, sale) => {
      const commission = calculateCommission(sale.valorTotal, sale.valorTabela, sale.uf);
      return acc + (commission.comissaoLiquida * BONUS_PERCENTAGE);
    }, 0);
    return {
      vendedor,
      vendas: vendorSales.length,
      totalBonus,
      sales: vendorSales
    };
  });

  const totalBonusGeral = sellerData.reduce((acc, s) => acc + s.totalBonus, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title="Total Bônus Interno"
          value={formatCurrency(totalBonusGeral)}
          subtitle={`${BONUS_PERCENTAGE * 100}% da comissão líquida`}
          variant="primary"
        />
        <SummaryCard
          title="Vendedores Ativos"
          value={vendedoresInternos.length.toString()}
          subtitle="Equipe interna"
        />
        <SummaryCard
          title="Vendas Conciliadas"
          value={sales.filter(s => s.status === 'pago').length.toString()}
          subtitle="Aptas para pagamento"
          variant="success"
        />
      </div>

      {sellerData.map(({ vendedor, vendas, totalBonus, sales: vendorSales }) => (
        <div key={vendedor} className="border border-border">
          <div className="bg-muted/50 px-4 py-3 flex items-center justify-between border-b border-border">
            <div>
              <h3 className="font-semibold">{vendedor}</h3>
              <p className="text-xs text-muted-foreground">{vendas} vendas | Bônus: {formatCurrency(totalBonus)}</p>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold uppercase text-xs tracking-wide">Cliente</TableHead>
                <TableHead className="font-semibold uppercase text-xs tracking-wide">NF-e</TableHead>
                <TableHead className="font-semibold uppercase text-xs tracking-wide text-right">Valor NF</TableHead>
                <TableHead className="font-semibold uppercase text-xs tracking-wide text-right">Bônus (30%)</TableHead>
                <TableHead className="font-semibold uppercase text-xs tracking-wide">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendorSales.map(sale => {
                const commission = calculateCommission(sale.valorTotal, sale.valorTabela, sale.uf);
                const bonus = commission.comissaoLiquida * BONUS_PERCENTAGE;
                return (
                  <TableRow key={sale.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{sale.cliente}</TableCell>
                    <TableCell className="font-mono text-sm">{sale.nfe}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(sale.valorTotal)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-primary">
                      {formatCurrency(bonus)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={sale.status} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}
