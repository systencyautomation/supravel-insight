import { useState, useMemo } from 'react';
import { useSalesWithCalculations, SaleWithCalculations } from '@/hooks/useSalesWithCalculations';
import { useSellerProfiles } from '@/hooks/useSellerProfiles';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import { SummaryCard } from '@/components/SummaryCard';
import { CommissionFilters, CommissionFiltersState } from './CommissionFilters';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase } from 'lucide-react';
import { format } from 'date-fns';

export function RepresentativeCommissions() {
  const { sales, loading: salesLoading } = useSalesWithCalculations();
  const { representatives, getRepresentative, loading: profilesLoading } = useSellerProfiles();
  const { settings: orgSettings } = useOrganizationSettings();

  // Estado dos filtros
  const [filters, setFilters] = useState<CommissionFiltersState>({
    sellerId: null,
    startDate: null,
    endDate: null,
    search: '',
  });

  // Lista de representantes para o filtro
  const repOptions = useMemo(() => {
    return Array.from(representatives.values()).map(rep => ({
      id: rep.id,
      name: rep.name || 'Sem nome',
      email: rep.email || '',
      company: rep.company || '',
    }));
  }, [representatives]);

  // Filtrar apenas vendas com representante atribuído
  const salesWithRep = useMemo(() => {
    return sales.filter(s => s.representative_id);
  }, [sales]);

  // Aplicar filtros
  const filteredSales = useMemo(() => {
    let result = [...salesWithRep];

    // Filtro por representante
    if (filters.sellerId) {
      result = result.filter(s => s.representative_id === filters.sellerId);
    }

    // Filtro por data inicial
    if (filters.startDate) {
      result = result.filter(s => {
        if (!s.emission_date) return false;
        const saleDate = new Date(s.emission_date);
        return saleDate >= filters.startDate!;
      });
    }

    // Filtro por data final
    if (filters.endDate) {
      result = result.filter(s => {
        if (!s.emission_date) return false;
        const saleDate = new Date(s.emission_date);
        const endOfDay = new Date(filters.endDate!);
        endOfDay.setHours(23, 59, 59, 999);
        return saleDate <= endOfDay;
      });
    }

    // Filtro por busca (cliente, NF)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(s => 
        s.client_name?.toLowerCase().includes(searchLower) ||
        s.nfe_number?.toLowerCase().includes(searchLower) ||
        s.client_cnpj?.includes(searchLower)
      );
    }

    return result;
  }, [salesWithRep, filters]);

  // Agrupar por representante
  const repData = useMemo(() => {
    const grouped = new Map<string, SaleWithCalculations[]>();
    
    filteredSales.forEach(sale => {
      const repId = sale.representative_id!;
      const existing = grouped.get(repId) || [];
      grouped.set(repId, [...existing, sale]);
    });

    // Calcular comissões por representante
    const overPercent = orgSettings?.comissao_over_percent ?? 10;
    const comissaoBase = orgSettings?.comissao_base || 'valor_tabela';

    return Array.from(grouped.entries()).map(([repId, repSales]) => {
      const rep = getRepresentative(repId);
      
      // Calcular comissão total do representante
      const totalComissao = repSales.reduce((acc, sale) => {
        const valorTabela = Number(sale.table_value) || 0;
        const comissaoEmpresa = sale.valorComissaoCalculado || 0;
        const overLiquido = sale.overPriceLiquido || 0;
        
        const baseCalculo = comissaoBase === 'valor_tabela' ? valorTabela : comissaoEmpresa;
        const percentualRep = Number(sale.percentual_comissao) || 3;
        
        const comissaoBaseVal = baseCalculo * (percentualRep / 100);
        const comissaoOver = overLiquido * (overPercent / 100);
        
        return acc + comissaoBaseVal + comissaoOver;
      }, 0);

      // Separar por status
      const vendasPagas = repSales.filter(s => s.status === 'pago');

      const comissaoPaga = vendasPagas.reduce((acc, sale) => {
        const valorTabela = Number(sale.table_value) || 0;
        const comissaoEmpresa = sale.valorComissaoCalculado || 0;
        const overLiquido = sale.overPriceLiquido || 0;
        const baseCalculo = comissaoBase === 'valor_tabela' ? valorTabela : comissaoEmpresa;
        const percentualRep = Number(sale.percentual_comissao) || 3;
        const comissaoBaseVal = baseCalculo * (percentualRep / 100);
        const comissaoOver = overLiquido * (overPercent / 100);
        return acc + comissaoBaseVal + comissaoOver;
      }, 0);

      return {
        repId,
        repName: rep?.name || 'Representante não encontrado',
        repCompany: rep?.company || '',
        repEmail: rep?.email || '',
        sales: repSales,
        totalVendas: repSales.length,
        vendasPagas: vendasPagas.length,
        totalComissao,
        comissaoPaga,
        comissaoPendente: totalComissao - comissaoPaga,
      };
    }).sort((a, b) => b.totalComissao - a.totalComissao);
  }, [filteredSales, representatives, orgSettings]);

  // Totais gerais
  const totals = useMemo(() => {
    return repData.reduce((acc, rep) => ({
      totalComissao: acc.totalComissao + rep.totalComissao,
      comissaoPaga: acc.comissaoPaga + rep.comissaoPaga,
      comissaoPendente: acc.comissaoPendente + rep.comissaoPendente,
      totalVendas: acc.totalVendas + rep.totalVendas,
    }), { totalComissao: 0, comissaoPaga: 0, comissaoPendente: 0, totalVendas: 0 });
  }, [repData]);

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

  const overPercent = orgSettings?.comissao_over_percent ?? 10;
  const comissaoBase = orgSettings?.comissao_base || 'valor_tabela';
  const baseLabel = comissaoBase === 'valor_tabela' ? 'Tabela' : 'Comissão';

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <CommissionFilters
        sellers={repOptions}
        filters={filters}
        onFiltersChange={setFilters}
        type="representante"
      />

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Comissões"
          value={formatCurrency(totals.totalComissao)}
          subtitle={`${repData.length} representante(s)`}
          variant="primary"
        />
        <SummaryCard
          title="Representantes Ativos"
          value={repData.length.toString()}
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

      {/* Configuração ativa */}
      <div className="bg-muted/30 border border-border px-4 py-3 text-sm">
        <span className="text-muted-foreground">Base de cálculo: </span>
        <span className="font-medium">{baseLabel}</span>
        <span className="text-muted-foreground mx-2">|</span>
        <span className="text-muted-foreground">Over Price: </span>
        <span className="font-medium">{overPercent}%</span>
      </div>

      {/* Estado vazio */}
      {filteredSales.length === 0 ? (
        <div className="text-center py-12">
          <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">
            {salesWithRep.length === 0 
              ? 'Nenhuma comissão de representante encontrada'
              : 'Nenhum resultado para os filtros selecionados'
            }
          </h3>
          <p className="text-sm text-muted-foreground mt-2">
            {salesWithRep.length === 0 
              ? 'As comissões aparecerão aqui quando vendas forem aprovadas com representante atribuído.'
              : 'Tente ajustar os filtros para ver mais resultados.'
            }
          </p>
        </div>
      ) : (
        /* Lista de representantes */
        repData.map(({ repId, repName, repCompany, repEmail, sales: repSales, totalVendas, totalComissao, comissaoPaga, comissaoPendente }) => (
          <div key={repId} className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-3 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{repName}</h3>
                  <p className="text-xs text-muted-foreground">
                    {repCompany && `${repCompany} • `}{repEmail} • {totalVendas} venda(s)
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
                  <TableHead className="font-semibold uppercase text-xs tracking-wide text-right">Base ({baseLabel})</TableHead>
                  <TableHead className="font-semibold uppercase text-xs tracking-wide text-right">Over Líquido</TableHead>
                  <TableHead className="font-semibold uppercase text-xs tracking-wide text-right">Comissão</TableHead>
                  <TableHead className="font-semibold uppercase text-xs tracking-wide">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repSales.map(sale => {
                  const valorTabela = Number(sale.table_value) || 0;
                  const comissaoEmpresa = sale.valorComissaoCalculado || 0;
                  const overLiquido = sale.overPriceLiquido || 0;
                  const baseCalculo = comissaoBase === 'valor_tabela' ? valorTabela : comissaoEmpresa;
                  const percentualRep = Number(sale.percentual_comissao) || 3;
                  const comissaoBaseVal = baseCalculo * (percentualRep / 100);
                  const comissaoOver = overLiquido * (overPercent / 100);
                  const comissaoTotal = comissaoBaseVal + comissaoOver;
                  
                  return (
                    <TableRow key={sale.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-sm">
                        {sale.emission_date 
                          ? format(new Date(sale.emission_date), 'dd/MM/yyyy')
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="font-medium">{sale.client_name || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">{sale.nfe_number || '-'}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(Number(sale.total_value) || 0)}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatCurrency(baseCalculo)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatCurrency(overLiquido)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-primary">
                        {formatCurrency(comissaoTotal)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={sale.status as 'pendente' | 'pago' | 'parcial'} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ))
      )}
    </div>
  );
}
