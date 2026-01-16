import { StockItem } from '@/types/commission';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';

interface StockTableProps {
  stock: StockItem[];
}

export function StockTable({ stock }: StockTableProps) {
  return (
    <div className="border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-semibold uppercase text-xs tracking-wide">Modelo</TableHead>
            <TableHead className="font-semibold uppercase text-xs tracking-wide">Cód. Interno</TableHead>
            <TableHead className="font-semibold uppercase text-xs tracking-wide text-right">Valor Tabela</TableHead>
            <TableHead className="font-semibold uppercase text-xs tracking-wide text-right">% Comissão</TableHead>
            <TableHead className="font-semibold uppercase text-xs tracking-wide text-center">Qtd.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stock.map((item) => (
            <TableRow key={item.id} className="hover:bg-muted/30">
              <TableCell className="font-medium">{item.modelo}</TableCell>
              <TableCell className="font-mono text-sm">{item.codInterno}</TableCell>
              <TableCell className="text-right">
                <span className="font-mono">{formatCurrency(item.valorTabela)}</span>
              </TableCell>
              <TableCell className="text-right">
                <span className="font-mono">{item.percentualComissao}%</span>
              </TableCell>
              <TableCell className="text-center font-mono">{item.quantidade}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
