import { useState, useMemo } from 'react';
import { useSalesWithCalculations, SaleWithCalculations } from '@/hooks/useSalesWithCalculations';
import { useSellerProfiles } from '@/hooks/useSellerProfiles';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import { SummaryCard } from '@/components/SummaryCard';
import { CommissionFilters, CommissionFiltersState } from './CommissionFilters';
import { formatCurrency, cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { User, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

interface SaleRowProps {
  sale: SaleWithCalculations;
  isExpanded: boolean;
  onToggle: () => void;
  comissaoBase: string;
  overPercent: number;
  baseLabel: string;
}

function SaleRow({ sale, isExpanded, onToggle, comissaoBase, overPercent, baseLabel }: SaleRowProps) {
  const valorTabela = Number(sale.table_value) || 0;
  const comissaoEmpresa = sale.valorComissaoCalculado || 0;
  const overLiquido = sale.overPriceLiquido || 0;
  const baseCalculo = comissaoBase === 'valor_tabela' ? valorTabela : comissaoEmpresa;
  const percentualVendedor = Number(sale.percentual_comissao) || 3;
  const comissaoBaseVal = baseCalculo * (percentualVendedor / 100);
  const comissaoOver = overLiquido * (overPercent / 100);
  const comissaoTotal = comissaoBaseVal + comissaoOver;

  return (
    <>
      <TableRow 
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <TableCell>
          <div className="flex items-center gap-2">
            <ChevronDown 
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                isExpanded && "rotate-180"
              )} 
            />
            <span className="font-mono text-sm">
              {sale.emission_date 
                ? format(new Date(sale.emission_date), 'dd/MM/yyyy')
                : '-'
              }
            </span>
          </div>
        </TableCell>
        <TableCell className="font-medium">{sale.client_name || '-'}</TableCell>
        <TableCell className="font-mono text-sm">{sale.nfe_number || '-'}</TableCell>
        <TableCell className="text-right font-mono">{formatCurrency(Number(sale.total_value) || 0)}</TableCell>
        <TableCell className="text-right font-mono text-muted-foreground">
          {formatCurrency(comissaoBaseVal)}
        </TableCell>
        <TableCell className="text-right font-mono text-muted-foreground">
          {formatCurrency(comissaoOver)}
        </TableCell>
        <TableCell className="text-right font-mono font-semibold text-primary">
          {formatCurrency(comissaoTotal)}
        </TableCell>
        <TableCell>
          <StatusBadge status={sale.status as 'pendente' | 'pago' | 'parcial'} />
        </TableCell>
      </TableRow>
      
      {isExpanded && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={8} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              {/* Card Comissão Base */}
              <div className="bg-background border border-border rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Comissão Base
                </p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base ({baseLabel})</span>
                    <span className="font-mono">{formatCurrency(baseCalculo)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Percentual</span>
                    <span className="font-mono">{percentualVendedor}%</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Resultado</span>
                    <span className="font-mono">{formatCurrency(comissaoBaseVal)}</span>
                  </div>
                </div>
              </div>
              
              {/* Card Over */}
              <div className="bg-background border border-border rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Over Price
                </p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Over Líquido</span>
                    <span className="font-mono">{formatCurrency(overLiquido)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Percentual</span>
                    <span className="font-mono">{overPercent}%</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Resultado</span>
                    <span className="font-mono">{formatCurrency(comissaoOver)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Total */}
            <div className="mt-4 pt-3 border-t border-border max-w-2xl">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Vendedor</span>
                <span className="text-lg font-semibold text-primary font-mono">
                  {formatCurrency(comissaoTotal)}
                </span>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function InternalSellerCommissions() {
  const { sales, loading: salesLoading } = useSalesWithCalculations();
  const { internalSellers, getInternalSeller, loading: profilesLoading } = useSellerProfiles();
  const { settings: orgSettings } = useOrganizationSettings();

  const [filters, setFilters] = useState<CommissionFiltersState>({
    sellerId: null,
    startDate: null,
    endDate: null,
    search: '',
  });

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (saleId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(saleId)) {
        next.delete(saleId);
      } else {
        next.add(saleId);
      }
      return next;
    });
  };

  const sellerOptions = useMemo(() => {
    return Array.from(internalSellers.values()).map(seller => ({
      id: seller.id,
      name: seller.full_name || 'Sem nome',
      email: seller.email || '',
    }));
  }, [internalSellers]);

  const salesWithSeller = useMemo(() => {
    return sales.filter(s => s.internal_seller_id);
  }, [sales]);

  const filteredSales = useMemo(() => {
    let result = [...salesWithSeller];

    if (filters.sellerId) {
      result = result.filter(s => s.internal_seller_id === filters.sellerId);
    }

    if (filters.startDate) {
      result = result.filter(s => {
        if (!s.emission_date) return false;
        const saleDate = new Date(s.emission_date);
        return saleDate >= filters.startDate!;
      });
    }

    if (filters.endDate) {
      result = result.filter(s => {
        if (!s.emission_date) return false;
        const saleDate = new Date(s.emission_date);
        const endOfDay = new Date(filters.endDate!);
        endOfDay.setHours(23, 59, 59, 999);
        return saleDate <= endOfDay;
      });
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(s => 
        s.client_name?.toLowerCase().includes(searchLower) ||
        s.nfe_number?.toLowerCase().includes(searchLower) ||
        s.client_cnpj?.includes(searchLower)
      );
    }

    return result;
  }, [salesWithSeller, filters]);

  const overPercent = orgSettings?.comissao_over_percent ?? 10;
  const comissaoBase = orgSettings?.comissao_base || 'valor_tabela';
  const baseLabel = comissaoBase === 'valor_tabela' ? 'Tabela' : 'Comissão';

  const sellerData = useMemo(() => {
    const grouped = new Map<string, SaleWithCalculations[]>();
    
    filteredSales.forEach(sale => {
      const sellerId = sale.internal_seller_id!;
      const existing = grouped.get(sellerId) || [];
      grouped.set(sellerId, [...existing, sale]);
    });

    return Array.from(grouped.entries()).map(([sellerId, sellerSales]) => {
      const seller = getInternalSeller(sellerId);
      
      const totalComissao = sellerSales.reduce((acc, sale) => {
        const valorTabela = Number(sale.table_value) || 0;
        const comissaoEmpresa = sale.valorComissaoCalculado || 0;
        const overLiquido = sale.overPriceLiquido || 0;
        const baseCalculo = comissaoBase === 'valor_tabela' ? valorTabela : comissaoEmpresa;
        const percentualVendedor = Number(sale.percentual_comissao) || 3;
        const comissaoBaseValue = baseCalculo * (percentualVendedor / 100);
        const comissaoOver = overLiquido * (overPercent / 100);
        return acc + comissaoBaseValue + comissaoOver;
      }, 0);

      const vendasPagas = sellerSales.filter(s => s.status === 'pago');

      const comissaoPaga = vendasPagas.reduce((acc, sale) => {
        const valorTabela = Number(sale.table_value) || 0;
        const comissaoEmpresa = sale.valorComissaoCalculado || 0;
        const overLiquido = sale.overPriceLiquido || 0;
        const baseCalculo = comissaoBase === 'valor_tabela' ? valorTabela : comissaoEmpresa;
        const percentualVendedor = Number(sale.percentual_comissao) || 3;
        const comissaoBaseVal = baseCalculo * (percentualVendedor / 100);
        const comissaoOver = overLiquido * (overPercent / 100);
        return acc + comissaoBaseVal + comissaoOver;
      }, 0);

      return {
        sellerId,
        sellerName: seller?.full_name || 'Vendedor não encontrado',
        sellerEmail: seller?.email || '',
        sales: sellerSales,
        totalVendas: sellerSales.length,
        totalComissao,
        comissaoPaga,
        comissaoPendente: totalComissao - comissaoPaga,
      };
    }).sort((a, b) => b.totalComissao - a.totalComissao);
  }, [filteredSales, internalSellers, orgSettings, comissaoBase, overPercent, getInternalSeller]);

  const totals = useMemo(() => {
    return sellerData.reduce((acc, seller) => ({
      totalComissao: acc.totalComissao + seller.totalComissao,
      comissaoPaga: acc.comissaoPaga + seller.comissaoPaga,
      comissaoPendente: acc.comissaoPendente + seller.comissaoPendente,
      totalVendas: acc.totalVendas + seller.totalVendas,
    }), { totalComissao: 0, comissaoPaga: 0, comissaoPendente: 0, totalVendas: 0 });
  }, [sellerData]);

  const loading = salesLoading || profilesLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CommissionFilters
        sellers={sellerOptions}
        filters={filters}
        onFiltersChange={setFilters}
        type="vendedor"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Comissões"
          value={formatCurrency(totals.totalComissao)}
          subtitle={`${sellerData.length} vendedor(es)`}
          variant="primary"
        />
        <SummaryCard
          title="Vendedores Ativos"
          value={sellerData.length.toString()}
          subtitle={`${totals.totalVendas} vendas atribuídas`}
        />
        <SummaryCard
          title="Comissão Paga"
          value={formatCurrency(totals.comissaoPaga)}
          subtitle="Vendas finalizadas"
          variant="success"
        />
        <SummaryCard
          title="Comissão Pendente"
          value={formatCurrency(totals.comissaoPendente)}
          subtitle="Aguardando pagamento"
        />
      </div>

      <div className="bg-muted/30 border border-border px-4 py-3 text-sm rounded-md">
        <span className="text-muted-foreground">Base de cálculo: </span>
        <span className="font-medium">{baseLabel}</span>
        <span className="text-muted-foreground mx-2">|</span>
        <span className="text-muted-foreground">Over Price: </span>
        <span className="font-medium">{overPercent}%</span>
      </div>

      {filteredSales.length === 0 ? (
        <div className="text-center py-12">
          <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">
            {salesWithSeller.length === 0 
              ? 'Nenhuma comissão de vendedor encontrada'
              : 'Nenhum resultado para os filtros selecionados'
            }
          </h3>
          <p className="text-sm text-muted-foreground mt-2">
            {salesWithSeller.length === 0 
              ? 'As comissões aparecerão aqui quando vendas forem aprovadas com vendedor atribuído.'
              : 'Tente ajustar os filtros para ver mais resultados.'
            }
          </p>
        </div>
      ) : (
        sellerData.map(({ sellerId, sellerName, sellerEmail, sales: sellerSales, totalVendas, totalComissao, comissaoPaga, comissaoPendente }) => (
          <div key={sellerId} className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-3 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{sellerName}</h3>
                  <p className="text-xs text-muted-foreground">
                    {sellerEmail} • {totalVendas} venda(s)
                  </p>
                </div>
              </div>
              <div className="flex gap-6 text-sm">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-semibold text-primary">{formatCurrency(totalComissao)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Pago</p>
                  <p className="font-medium text-[hsl(var(--success))]">{formatCurrency(comissaoPaga)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Pendente</p>
                  <p className="font-medium">{formatCurrency(comissaoPendente)}</p>
                </div>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold uppercase text-xs tracking-wide">Data</TableHead>
                  <TableHead className="font-semibold uppercase text-xs tracking-wide">Cliente</TableHead>
                  <TableHead className="font-semibold uppercase text-xs tracking-wide">NF-e</TableHead>
                  <TableHead className="font-semibold uppercase text-xs tracking-wide text-right">Valor NF</TableHead>
                  <TableHead className="font-semibold uppercase text-xs tracking-wide text-right">Comissão</TableHead>
                  <TableHead className="font-semibold uppercase text-xs tracking-wide text-right">Over</TableHead>
                  <TableHead className="font-semibold uppercase text-xs tracking-wide text-right">Total</TableHead>
                  <TableHead className="font-semibold uppercase text-xs tracking-wide">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellerSales.map(sale => (
                  <SaleRow
                    key={sale.id}
                    sale={sale}
                    isExpanded={expandedRows.has(sale.id)}
                    onToggle={() => toggleRow(sale.id)}
                    comissaoBase={comissaoBase}
                    overPercent={overPercent}
                    baseLabel={baseLabel}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        ))
      )}
    </div>
  );
}
