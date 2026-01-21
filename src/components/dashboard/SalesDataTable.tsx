import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Search, 
  Filter,
  CheckCircle2,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { SaleWithCalculations } from '@/hooks/useSalesWithCalculations';
import { formatCurrency, formatPercent } from '@/lib/approvalCalculator';
import { SaleDetailSheet } from './SaleDetailSheet';

interface SalesDataTableProps {
  sales: SaleWithCalculations[];
  loading?: boolean;
}

type SortField = 'emission_date' | 'nfe_number' | 'client_name' | 'total_value' | 'percentualComissaoCalculado' | 'valorComissaoCalculado';
type SortDirection = 'asc' | 'desc';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendente: { label: 'Pendente', variant: 'secondary' },
  aprovado: { label: 'Aprovado', variant: 'default' },
  pago: { label: 'Pago', variant: 'outline' },
  rejeitado: { label: 'Rejeitado', variant: 'destructive' },
};

export function SalesDataTable({ sales, loading }: SalesDataTableProps) {
  // States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('emission_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedSale, setSelectedSale] = useState<SaleWithCalculations | null>(null);

  // Filter and sort data
  const filteredAndSortedSales = useMemo(() => {
    let result = [...sales];

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(sale => 
        sale.client_name?.toLowerCase().includes(searchLower) ||
        sale.nfe_number?.toLowerCase().includes(searchLower) ||
        sale.produto_modelo?.toLowerCase().includes(searchLower) ||
        sale.client_cnpj?.includes(search)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(sale => sale.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'emission_date':
          aValue = a.emission_date ? new Date(a.emission_date).getTime() : 0;
          bValue = b.emission_date ? new Date(b.emission_date).getTime() : 0;
          break;
        case 'nfe_number':
          aValue = a.nfe_number || '';
          bValue = b.nfe_number || '';
          break;
        case 'client_name':
          aValue = a.client_name || '';
          bValue = b.client_name || '';
          break;
        case 'total_value':
          aValue = Number(a.total_value) || 0;
          bValue = Number(b.total_value) || 0;
          break;
        case 'percentualComissaoCalculado':
          aValue = a.percentualComissaoCalculado;
          bValue = b.percentualComissaoCalculado;
          break;
        case 'valorComissaoCalculado':
          aValue = a.valorComissaoCalculado;
          bValue = b.valorComissaoCalculado;
          break;
        default:
          aValue = 0;
          bValue = 0;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });

    return result;
  }, [sales, search, statusFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedSales.length / pageSize);
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedSales.slice(start, start + pageSize);
  }, [filteredAndSortedSales, currentPage, pageSize]);

  // Handlers
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4" /> 
      : <ArrowDown className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-3 items-center w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente, NF, produto..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 bg-background/50"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[140px] bg-background/50">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="rejeitado">Rejeitado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-muted-foreground">
          {filteredAndSortedSales.length} venda{filteredAndSortedSales.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/50 overflow-hidden bg-card/50">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              <TableHead 
                className="cursor-pointer select-none"
                onClick={() => handleSort('emission_date')}
              >
                <div className="flex items-center gap-2">
                  Data
                  <SortIcon field="emission_date" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none"
                onClick={() => handleSort('nfe_number')}
              >
                <div className="flex items-center gap-2">
                  NF
                  <SortIcon field="nfe_number" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none"
                onClick={() => handleSort('client_name')}
              >
                <div className="flex items-center gap-2">
                  Cliente
                  <SortIcon field="client_name" />
                </div>
              </TableHead>
              <TableHead>Produto</TableHead>
              <TableHead 
                className="text-right cursor-pointer select-none"
                onClick={() => handleSort('total_value')}
              >
                <div className="flex items-center justify-end gap-2">
                  Valor Total
                  <SortIcon field="total_value" />
                </div>
              </TableHead>
              <TableHead className="text-right">Entrada</TableHead>
              <TableHead 
                className="text-right cursor-pointer select-none"
                onClick={() => handleSort('percentualComissaoCalculado')}
              >
                <div className="flex items-center justify-end gap-2">
                  % Comissão
                  <SortIcon field="percentualComissaoCalculado" />
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer select-none"
                onClick={() => handleSort('valorComissaoCalculado')}
              >
                <div className="flex items-center justify-end gap-2">
                  Valor Comissão
                  <SortIcon field="valorComissaoCalculado" />
                </div>
              </TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 10 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-muted/50 rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginatedSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                  Nenhuma venda encontrada
                </TableCell>
              </TableRow>
            ) : (
              paginatedSales.map((sale) => (
                <HoverCard key={sale.id} openDelay={300} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <TableRow className="hover:bg-muted/30 transition-colors">
                      {/* Data */}
                      <TableCell className="font-mono text-sm">
                        {sale.emission_date 
                          ? format(new Date(sale.emission_date), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'
                        }
                      </TableCell>
                      
                      {/* NF */}
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {sale.nfe_number || '-'}
                        </Badge>
                      </TableCell>
                      
                      {/* Cliente */}
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="truncate max-w-[150px] block cursor-help">
                                {sale.client_name || 'N/A'}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs">
                                <p className="font-medium">{sale.client_name}</p>
                                {sale.client_cnpj && (
                                  <p className="text-muted-foreground font-mono">{sale.client_cnpj}</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      
                      {/* Produto */}
                      <TableCell>
                        <span className="truncate max-w-[120px] block text-sm">
                          {sale.produto_modelo || '-'}
                        </span>
                      </TableCell>
                      
                      {/* Valor Total */}
                      <TableCell className="text-right font-mono">
                        {formatCurrency(Number(sale.total_value) || 0)}
                      </TableCell>
                      
                      {/* Entrada */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-mono">
                            {formatCurrency(sale.entradaCalculada)}
                          </span>
                          {sale.entradaVerificada && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Verificado via {sale.qtdParcelas} boleto{sale.qtdParcelas > 1 ? 's' : ''}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      
                      {/* % Comissão */}
                      <TableCell className="text-right font-mono">
                        <span className={sale.percentualComissaoCalculado >= 0 ? 'text-emerald-500' : 'text-destructive'}>
                          {sale.percentualComissaoCalculado.toFixed(2)}%
                        </span>
                      </TableCell>
                      
                      {/* Valor Comissão */}
                      <TableCell className="text-right font-mono">
                        <span className={sale.valorComissaoCalculado >= 0 ? 'text-emerald-500' : 'text-destructive'}>
                          {formatCurrency(sale.valorComissaoCalculado)}
                        </span>
                      </TableCell>
                      
                      {/* Status */}
                      <TableCell className="text-center">
                        <Badge variant={statusConfig[sale.status || 'pendente']?.variant || 'secondary'}>
                          {statusConfig[sale.status || 'pendente']?.label || sale.status}
                        </Badge>
                      </TableCell>
                      
                      {/* Actions */}
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSelectedSale(sale)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  </HoverCardTrigger>
                  
                  {/* Hover Card - Cálculo Over Price */}
                  <HoverCardContent side="left" className="w-72">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Cálculo Over Price</h4>
                      <div className="text-xs space-y-1 font-mono">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Valor Real (VP):</span>
                          <span>{formatCurrency(sale.valorReal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">(-) Valor Tabela:</span>
                          <span>{formatCurrency(Number(sale.table_value) || 0)}</span>
                        </div>
                        <div className="border-t border-border/50 my-1" />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Over Bruto:</span>
                          <span className={sale.overPriceBruto >= 0 ? 'text-emerald-500' : 'text-destructive'}>
                            {formatCurrency(sale.overPriceBruto)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">(-) ICMS:</span>
                          <span className="text-destructive">-{formatCurrency(sale.deducaoIcms)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">(-) PIS/COFINS 9,25%:</span>
                          <span className="text-destructive">-{formatCurrency(sale.deducaoPisCofins)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">(-) IR/CSLL 34%:</span>
                          <span className="text-destructive">-{formatCurrency(sale.deducaoIrCsll)}</span>
                        </div>
                        <div className="border-t border-border/50 my-1" />
                        <div className="flex justify-between font-semibold">
                          <span>Over Líquido:</span>
                          <span className={sale.overPriceLiquido >= 0 ? 'text-emerald-500' : 'text-destructive'}>
                            {formatCurrency(sale.overPriceLiquido)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Mostrar</span>
          <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span>por página</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages || 1}
          </span>
          
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Sale Detail Sheet */}
      <SaleDetailSheet
        sale={selectedSale}
        installments={selectedSale?.installments || []}
        open={!!selectedSale}
        onOpenChange={(open) => !open && setSelectedSale(null)}
      />
    </div>
  );
}
