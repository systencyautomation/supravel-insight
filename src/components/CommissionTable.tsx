import { useNavigate } from 'react-router-dom';
import { Sale } from '@/types/commission';
import { calculateCommission, calculateICMSRate } from '@/types/commission';
import { StatusBadge } from './StatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';

interface CommissionTableProps {
  sales: Sale[];
  showDetails?: boolean;
}

export function CommissionTable({ sales, showDetails = true }: CommissionTableProps) {
  const navigate = useNavigate();

  return (
    <div className="border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-semibold uppercase text-xs tracking-wide">Cliente</TableHead>
            <TableHead className="font-semibold uppercase text-xs tracking-wide">NF-e</TableHead>
            <TableHead className="font-semibold uppercase text-xs tracking-wide text-right">Valor NF</TableHead>
            {showDetails && (
              <>
                <TableHead className="font-semibold uppercase text-xs tracking-wide text-right">Valor Tabela</TableHead>
                <TableHead className="font-semibold uppercase text-xs tracking-wide text-right">Over Price</TableHead>
                <TableHead className="font-semibold uppercase text-xs tracking-wide text-right">ICMS ({'>'}UF)</TableHead>
                <TableHead className="font-semibold uppercase text-xs tracking-wide text-right">Comissão Líq.</TableHead>
              </>
            )}
            <TableHead className="font-semibold uppercase text-xs tracking-wide">Pagamento</TableHead>
            <TableHead className="font-semibold uppercase text-xs tracking-wide">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((sale) => {
            const commission = calculateCommission(sale.valorTotal, sale.valorTabela, sale.uf);
            const icmsRate = calculateICMSRate(sale.uf);
            
            return (
              <TableRow key={sale.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{sale.cliente}</TableCell>
                <TableCell className="font-mono text-sm">{sale.nfe}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(sale.valorTotal)}</TableCell>
                {showDetails && (
                  <>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {formatCurrency(sale.valorTabela)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-primary">
                      {formatCurrency(commission.overPrice)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {(icmsRate * 100).toFixed(0)}% ({sale.uf})
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {formatCurrency(commission.comissaoLiquida)}
                    </TableCell>
                  </>
                )}
                <TableCell>
                  <span className="text-xs uppercase tracking-wide">
                    {sale.formaPagamento === 'boleto' 
                      ? `${sale.boletos || 1}x Boleto` 
                      : 'À Vista'}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge 
                    status={sale.status} 
                    onClick={sale.status === 'pendente' ? () => navigate(`/aprovacao?saleId=${sale.id}`) : undefined}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
