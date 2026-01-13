import { Sale } from '@/types/commission';
import { calculateCommission } from '@/types/commission';
import { CommissionTable } from '@/components/CommissionTable';
import { SummaryCard } from '@/components/SummaryCard';
import { formatCurrency } from '@/lib/utils';

interface CompanyCommissionsProps {
  sales: Sale[];
}

export function CompanyCommissions({ sales }: CompanyCommissionsProps) {
  const totalVendas = sales.reduce((acc, sale) => acc + sale.valorTotal, 0);
  const totalOverPrice = sales.reduce((acc, sale) => {
    const commission = calculateCommission(sale.valorTotal, sale.valorTabela, sale.uf);
    return acc + commission.overPrice;
  }, 0);
  const totalComissaoLiquida = sales.reduce((acc, sale) => {
    const commission = calculateCommission(sale.valorTotal, sale.valorTabela, sale.uf);
    return acc + commission.comissaoLiquida;
  }, 0);
  const vendasPagas = sales.filter(s => s.status === 'pago').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Vendas"
          value={formatCurrency(totalVendas)}
          subtitle={`${sales.length} NF-e processadas`}
        />
        <SummaryCard
          title="Over Price Total"
          value={formatCurrency(totalOverPrice)}
          subtitle="Margem bruta"
          variant="primary"
        />
        <SummaryCard
          title="Comissão Líquida"
          value={formatCurrency(totalComissaoLiquida)}
          subtitle="Após deduções fiscais"
          variant="success"
        />
        <SummaryCard
          title="Vendas Pagas"
          value={`${vendasPagas}/${sales.length}`}
          subtitle="Conciliadas"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Vendas Recentes</h2>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Fonte: n8n/XML
          </p>
        </div>
        <CommissionTable sales={sales} />
      </div>

      <div className="p-4 bg-muted/30 border border-border">
        <h3 className="text-sm font-semibold mb-2">Deduções Aplicadas</h3>
        <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
          <div>
            <span className="font-mono">PIS/COFINS:</span> 9,25%
          </div>
          <div>
            <span className="font-mono">IR/CSLL:</span> 34%
          </div>
          <div>
            <span className="font-mono">ICMS:</span> 4%, 7% ou 12% (UF)
          </div>
        </div>
      </div>
    </div>
  );
}
