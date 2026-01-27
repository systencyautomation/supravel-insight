import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowUpDown, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCurrency } from '@/lib/utils';
import { Recebimento } from '@/hooks/useRecebimentosData';

type SortField = 'data' | 'tipo' | 'nf' | 'cliente' | 'produto' | 'valor' | 'percentual_comissao' | 'valor_comissao' | 'status';
type SortDirection = 'asc' | 'desc';

interface RecebimentosTableProps {
  recebimentos: Recebimento[];
  loading?: boolean;
  onStatusChange: (recebimento: Recebimento, newStatus: 'pago' | 'pendente') => Promise<void>;
}

export function RecebimentosTable({ recebimentos, loading, onStatusChange }: RecebimentosTableProps) {
  const [sortField, setSortField] = useState<SortField>('data');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedRecebimentos = [...recebimentos].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'data':
        comparison = a.data.getTime() - b.data.getTime();
        break;
      case 'tipo':
        const tipoA = a.tipo === 'entrada' ? 'Entrada' : `Parcela ${a.numero_parcela}`;
        const tipoB = b.tipo === 'entrada' ? 'Entrada' : `Parcela ${b.numero_parcela}`;
        comparison = tipoA.localeCompare(tipoB);
        break;
      case 'nf':
        comparison = a.nf.localeCompare(b.nf);
        break;
      case 'cliente':
        comparison = a.cliente.localeCompare(b.cliente);
        break;
      case 'produto':
        comparison = a.produto.localeCompare(b.produto);
        break;
      case 'valor':
        comparison = a.valor - b.valor;
        break;
      case 'percentual_comissao':
        comparison = a.percentual_comissao - b.percentual_comissao;
        break;
      case 'valor_comissao':
        comparison = a.valor_comissao - b.valor_comissao;
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleStatusClick = async (recebimento: Recebimento) => {
    const newStatus = recebimento.status === 'pago' ? 'pendente' : 'pago';
    setUpdatingId(recebimento.id);
    try {
      await onStatusChange(recebimento, newStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
      </div>
    </TableHead>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (recebimentos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum recebimento encontrado com os filtros selecionados.
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <SortableHeader field="data">Data</SortableHeader>
            <SortableHeader field="tipo">Tipo</SortableHeader>
            <SortableHeader field="nf">NF</SortableHeader>
            <SortableHeader field="cliente">Cliente</SortableHeader>
            <SortableHeader field="produto">Produto</SortableHeader>
            <SortableHeader field="valor">Valor</SortableHeader>
            <SortableHeader field="percentual_comissao">% Com</SortableHeader>
            <SortableHeader field="valor_comissao">Valor Com</SortableHeader>
            <SortableHeader field="status">Status</SortableHeader>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRecebimentos.map((recebimento) => (
            <TableRow key={recebimento.id} className="hover:bg-muted/30">
              <TableCell className="font-medium">
                {format(recebimento.data, 'dd/MM/yyyy', { locale: ptBR })}
              </TableCell>
              <TableCell>
                <span className={recebimento.tipo === 'entrada' ? 'text-primary font-medium' : 'text-muted-foreground'}>
                  {recebimento.tipo === 'entrada' ? 'Entrada' : `Parcela ${recebimento.numero_parcela}`}
                </span>
              </TableCell>
              <TableCell>{recebimento.nf}</TableCell>
              <TableCell className="max-w-[200px] truncate" title={recebimento.cliente}>
                {recebimento.cliente}
              </TableCell>
              <TableCell>{recebimento.produto}</TableCell>
              <TableCell className="font-medium">
                {formatCurrency(recebimento.valor)}
              </TableCell>
              <TableCell>
                {recebimento.percentual_comissao.toFixed(2)}%
              </TableCell>
              <TableCell className="text-primary font-medium">
                {formatCurrency(recebimento.valor_comissao)}
              </TableCell>
              <TableCell>
                {updatingId === recebimento.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <StatusBadge
                    status={recebimento.status}
                    onClick={() => handleStatusClick(recebimento)}
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
