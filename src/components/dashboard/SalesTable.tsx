import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, BadgeCheck, AlertCircle, Clock, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { formatCurrency } from '@/lib/utils';
import { SaleWithCalculations } from '@/hooks/useSalesWithCalculations';
import { SaleDetailSheet } from './SaleDetailSheet';

interface SalesTableProps {
  sales: SaleWithCalculations[];
  className?: string;
  limit?: number;
}

export function SalesTable({ sales, className, limit = 10 }: SalesTableProps) {
  const navigate = useNavigate();
  const [selectedSale, setSelectedSale] = useState<SaleWithCalculations | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const displaySales = limit ? sales.slice(0, limit) : sales;

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'pago':
      case 'aprovado':
        return (
          <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1">
            <BadgeCheck className="h-3 w-3" />
            {status === 'pago' ? 'Pago' : 'Aprovado'}
          </Badge>
        );
      case 'pendente':
        return (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 gap-1">
            <Clock className="h-3 w-3" />
            Pendente
          </Badge>
        );
      case 'rejeitado':
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
            <AlertCircle className="h-3 w-3" />
            Rejeitado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            {status || 'N/A'}
          </Badge>
        );
    }
  };

  const handleViewSale = (sale: SaleWithCalculations) => {
    setSelectedSale(sale);
    setSheetOpen(true);
  };

  const handleNavigateApproval = (saleId: string) => {
    navigate(`/sales/${saleId}/approval`);
  };

  if (displaySales.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Vendas Recentes</CardTitle>
          <CardDescription>Últimas transações processadas</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-40">
          <p className="text-muted-foreground">Nenhuma venda encontrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Vendas Recentes</CardTitle>
              <CardDescription>Últimas transações processadas</CardDescription>
            </div>
            <Badge variant="secondary" className="font-mono text-xs">
              {sales.length} vendas
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-semibold">Data</TableHead>
                  <TableHead className="font-semibold">Cliente</TableHead>
                  <TableHead className="font-semibold">Modelo</TableHead>
                  <TableHead className="font-semibold text-right">Valor NF</TableHead>
                  <TableHead className="font-semibold text-right">Entrada</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displaySales.map((sale, index) => {
                  const overPrice = (sale.total_value || 0) - (sale.table_value || 0);
                  const hasVerifiedEntry = sale.valor_entrada !== null && sale.valor_entrada !== undefined;

                  return (
                    <TableRow 
                      key={sale.id}
                      className="transition-colors animate-fade-in cursor-pointer"
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => handleViewSale(sale)}
                    >
                      <TableCell className="font-mono text-sm">
                        {sale.emission_date 
                          ? format(parseISO(sale.emission_date), 'dd/MM/yy', { locale: ptBR })
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate block max-w-[180px] cursor-help">
                              {sale.client_name || 'Cliente não informado'}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <div className="space-y-1">
                              <p className="font-medium">{sale.client_name}</p>
                              {sale.client_cnpj && (
                                <p className="text-xs text-muted-foreground font-mono">
                                  CNPJ: {sale.client_cnpj}
                                </p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-sm">
                        {sale.produto_modelo || sale.produto_marca || 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <HoverCard openDelay={200}>
                          <HoverCardTrigger asChild>
                            <span className="font-medium cursor-help hover:text-primary transition-colors">
                              {formatCurrency(sale.total_value || 0)}
                            </span>
                          </HoverCardTrigger>
                          <HoverCardContent side="left" className="w-64">
                            <div className="space-y-2">
                              <p className="text-sm font-semibold">Cálculo do Over Price</p>
                              <div className="space-y-1 text-xs font-mono">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Valor NF:</span>
                                  <span>{formatCurrency(sale.total_value || 0)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Valor Tabela:</span>
                                  <span>{formatCurrency(sale.table_value || 0)}</span>
                                </div>
                                <div className="border-t border-border pt-1 flex justify-between font-semibold">
                                  <span>Over Price:</span>
                                  <span className={overPrice >= 0 ? 'text-success' : 'text-destructive'}>
                                    {formatCurrency(overPrice)}
                                  </span>
                                </div>
                                {sale.over_price_liquido !== null && (
                                  <div className="flex justify-between text-muted-foreground">
                                    <span>Após deduções:</span>
                                    <span>{formatCurrency(sale.over_price_liquido)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-medium">
                            {formatCurrency(sale.valor_entrada || 0)}
                          </span>
                          {hasVerifiedEntry && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <BadgeCheck className="h-3.5 w-3.5 text-success" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Verificado via Boleto
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(sale.status)}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewSale(sale);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {sales.length > limit && (
            <div className="mt-4 text-center">
              <Button variant="outline" size="sm" onClick={() => navigate('/sales')}>
                Ver todas as {sales.length} vendas
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <SaleDetailSheet 
        sale={selectedSale}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </TooltipProvider>
  );
}
