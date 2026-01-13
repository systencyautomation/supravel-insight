import { Sale } from '@/types/commission';
import { calculateCommission } from '@/types/commission';
import { SummaryCard } from '@/components/SummaryCard';
import { formatCurrency } from '@/lib/utils';
import { representantes } from '@/data/mockData';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';

interface RepresentativeCommissionsProps {
  sales: Sale[];
}

export function RepresentativeCommissions({ sales }: RepresentativeCommissionsProps) {
  // Representatives get 50% of the net commission
  const REP_PERCENTAGE = 0.50;

  const repData = representantes.map(rep => {
    const repSales = sales.filter(s => s.representante === rep);
    const totalComissao = repSales.reduce((acc, sale) => {
      const commission = calculateCommission(sale.valorTotal, sale.valorTabela, sale.uf);
      return acc + (commission.comissaoLiquida * REP_PERCENTAGE);
    }, 0);
    const pago = repSales.filter(s => s.status === 'pago').reduce((acc, sale) => {
      const commission = calculateCommission(sale.valorTotal, sale.valorTabela, sale.uf);
      return acc + (commission.comissaoLiquida * REP_PERCENTAGE);
    }, 0);
    return {
      rep,
      vendas: repSales.length,
      totalComissao,
      pago,
      pendente: totalComissao - pago,
      sales: repSales
    };
  });

  const totalGeral = repData.reduce((acc, r) => acc + r.totalComissao, 0);
  const totalPago = repData.reduce((acc, r) => acc + r.pago, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title="Total Representantes"
          value={formatCurrency(totalGeral)}
          subtitle={`${REP_PERCENTAGE * 100}% da comissão líquida`}
          variant="primary"
        />
        <SummaryCard
          title="Valor Pago"
          value={formatCurrency(totalPago)}
          subtitle="Vendas conciliadas"
          variant="success"
        />
        <SummaryCard
          title="Valor Pendente"
          value={formatCurrency(totalGeral - totalPago)}
          subtitle="Aguardando pagamento"
        />
      </div>

      {repData.map(({ rep, vendas, totalComissao, pago, pendente, sales: repSales }) => (
        <div key={rep} className="border border-border">
          <div className="bg-muted/50 px-4 py-3 flex items-center justify-between border-b border-border">
            <div>
              <h3 className="font-semibold">{rep}</h3>
              <p className="text-xs text-muted-foreground">
                {vendas} vendas | A Receber: {formatCurrency(totalComissao)}
              </p>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="text-[hsl(var(--success))]">Pago: {formatCurrency(pago)}</span>
              <span className="text-muted-foreground">Pendente: {formatCurrency(pendente)}</span>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold uppercase text-xs tracking-wide">Cliente</TableHead>
                <TableHead className="font-semibold uppercase text-xs tracking-wide">NF-e</TableHead>
                <TableHead className="font-semibold uppercase text-xs tracking-wide text-right">Valor NF</TableHead>
                <TableHead className="font-semibold uppercase text-xs tracking-wide text-right">Comissão (50%)</TableHead>
                <TableHead className="font-semibold uppercase text-xs tracking-wide">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repSales.map(sale => {
                const commission = calculateCommission(sale.valorTotal, sale.valorTabela, sale.uf);
                const repComissao = commission.comissaoLiquida * REP_PERCENTAGE;
                return (
                  <TableRow key={sale.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{sale.cliente}</TableCell>
                    <TableCell className="font-mono text-sm">{sale.nfe}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(sale.valorTotal)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-primary">
                      {formatCurrency(repComissao)}
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
