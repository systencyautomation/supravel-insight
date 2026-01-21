import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, BadgeCheck, FileText, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SaleWithCalculations } from '@/hooks/useSalesWithCalculations';
import { useSalesFilters, ColumnFilters } from '@/hooks/useSalesFilters';
import { ColumnFilterHeader } from './ColumnFilterHeader';
import { SaleDetailSheet } from '@/components/dashboard/SaleDetailSheet';
import { cn } from '@/lib/utils';

interface SalesListTableProps {
  sales: SaleWithCalculations[];
  loading?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const getStatusBadge = (status: string | null) => {
  switch (status) {
    case 'aprovado':
      return <Badge className="bg-success/20 text-success border-success/30">Aprovado</Badge>;
    case 'pendente':
      return <Badge className="bg-warning/20 text-warning border-warning/30">Pendente</Badge>;
    case 'pago':
      return <Badge className="bg-primary/20 text-primary border-primary/30">Pago</Badge>;
    case 'rejeitado':
      return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Rejeitado</Badge>;
    default:
      return <Badge variant="outline">{status || 'N/A'}</Badge>;
  }
};

export function SalesListTable({ sales, loading }: SalesListTableProps) {
  const {
    filters,
    sortColumn,
    sortDirection,
    uniqueValues,
    filteredSales,
    setColumnFilter,
    clearColumnFilter,
    clearAllFilters,
    handleSort,
    activeFilterCount,
  } = useSalesFilters(sales);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedSale, setSelectedSale] = useState<SaleWithCalculations | null>(null);

  // Pagination
  const totalPages = Math.ceil(filteredSales.length / pageSize);
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSales.slice(start, start + pageSize);
  }, [filteredSales, currentPage, pageSize]);

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [filters, sortColumn, sortDirection]);

  // Generate unique values for currency/number columns as formatted strings
  const uniqueValorTotal = useMemo(() => {
    const values = new Set<string>();
    sales.forEach((s) => {
      if (s.total_value) values.add(formatCurrency(Number(s.total_value)));
    });
    return Array.from(values).sort();
  }, [sales]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Filters Bar */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap p-3 bg-muted/30 rounded-lg border border-border/50">
          <span className="text-sm text-muted-foreground">Filtros ativos:</span>
          {Object.entries(filters).map(([key, values]) => {
            if (values.size === 0) return null;
            return (
              <Badge key={key} variant="secondary" className="gap-1">
                {key}: {values.size} selecionado(s)
                <button
                  onClick={() => clearColumnFilter(key as keyof ColumnFilters)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs ml-auto">
            Limpar todos
          </Button>
        </div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando <span className="font-medium text-foreground">{paginatedSales.length}</span> de{' '}
          <span className="font-medium text-foreground">{filteredSales.length}</span> vendas
          {filteredSales.length !== sales.length && (
            <span className="text-muted-foreground"> (filtrado de {sales.length})</span>
          )}
        </p>
        <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 por página</SelectItem>
            <SelectItem value="25">25 por página</SelectItem>
            <SelectItem value="50">50 por página</SelectItem>
            <SelectItem value="100">100 por página</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border border-border/50 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-[100px]">
                <ColumnFilterHeader
                  title="Data"
                  columnKey="emission_date"
                  values={uniqueValues.data}
                  selectedValues={filters.data}
                  onFilterChange={(v) => setColumnFilter('data', v)}
                  onSort={(dir) => handleSort('emission_date', dir)}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  type="date"
                />
              </TableHead>
              <TableHead className="w-[80px]">
                <ColumnFilterHeader
                  title="NF"
                  columnKey="nfe_number"
                  values={uniqueValues.nf}
                  selectedValues={filters.nf}
                  onFilterChange={(v) => setColumnFilter('nf', v)}
                  onSort={(dir) => handleSort('nfe_number', dir)}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  type="text"
                />
              </TableHead>
              <TableHead className="min-w-[180px]">
                <ColumnFilterHeader
                  title="Cliente"
                  columnKey="client_name"
                  values={uniqueValues.cliente}
                  selectedValues={filters.cliente}
                  onFilterChange={(v) => setColumnFilter('cliente', v)}
                  onSort={(dir) => handleSort('client_name', dir)}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  type="text"
                />
              </TableHead>
              <TableHead className="min-w-[150px]">
                <ColumnFilterHeader
                  title="Produto"
                  columnKey="produto_modelo"
                  values={uniqueValues.produto}
                  selectedValues={filters.produto}
                  onFilterChange={(v) => setColumnFilter('produto', v)}
                  onSort={(dir) => handleSort('produto_modelo', dir)}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  type="text"
                />
              </TableHead>
              <TableHead className="text-right w-[120px]">
                <div className="flex items-center justify-end gap-1">
                  <span className="font-medium">Valor Total</span>
                </div>
              </TableHead>
              <TableHead className="text-right w-[130px]">
                <div className="flex items-center justify-end gap-1">
                  <span className="font-medium">Entrada</span>
                </div>
              </TableHead>
              <TableHead className="text-right w-[100px]">
                <div className="flex items-center justify-end gap-1">
                  <span className="font-medium">% Comissão</span>
                </div>
              </TableHead>
              <TableHead className="text-right w-[130px]">
                <div className="flex items-center justify-end gap-1">
                  <span className="font-medium">Comissão</span>
                </div>
              </TableHead>
              <TableHead className="w-[100px]">
                <ColumnFilterHeader
                  title="Status"
                  columnKey="status"
                  values={uniqueValues.status}
                  selectedValues={filters.status}
                  onFilterChange={(v) => setColumnFilter('status', v)}
                  onSort={(dir) => handleSort('status', dir)}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  type="text"
                />
              </TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Nenhuma venda encontrada
                </TableCell>
              </TableRow>
            ) : (
              paginatedSales.map((sale) => (
                <TableRow
                  key={sale.id}
                  className="hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => setSelectedSale(sale)}
                >
                  <TableCell className="font-mono text-sm">
                    {sale.emission_date
                      ? format(new Date(sale.emission_date), 'dd/MM/yyyy', { locale: ptBR })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {sale.nfe_number || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="truncate max-w-[180px] block">
                          {sale.client_name || '-'}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{sale.client_name}</p>
                        {sale.client_cnpj && (
                          <p className="text-xs text-muted-foreground">CNPJ: {sale.client_cnpj}</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <span className="truncate max-w-[150px] block">
                      {sale.produto_modelo || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(Number(sale.total_value) || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="font-mono">{formatCurrency(sale.entradaCalculada)}</span>
                      {sale.entradaVerificada && (
                        <Tooltip>
                          <TooltipTrigger>
                            <BadgeCheck className="h-4 w-4 text-success" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Verificado via boletos</p>
                            <p className="text-xs text-muted-foreground">
                              {sale.qtdParcelas} parcelas de{' '}
                              {formatCurrency(sale.somaParcelas / sale.qtdParcelas)}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {sale.percentualComissaoCalculado.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        'font-mono font-medium',
                        sale.valorComissaoCalculado > 0 ? 'text-success' : 'text-muted-foreground'
                      )}
                    >
                      {formatCurrency(sale.valorComissaoCalculado)}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(sale.status)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSale(sale);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={cn(currentPage === 1 && 'pointer-events-none opacity-50')}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNum)}
                      isActive={currentPage === pageNum}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={cn(currentPage === totalPages && 'pointer-events-none opacity-50')}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Sale Detail Sheet */}
      <SaleDetailSheet
        sale={selectedSale}
        open={!!selectedSale}
        onOpenChange={(open) => !open && setSelectedSale(null)}
      />
    </div>
  );
}
