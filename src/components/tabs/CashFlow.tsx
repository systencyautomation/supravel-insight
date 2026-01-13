import { Installment } from '@/hooks/useOrganizationData';
import { SummaryCard } from '@/components/SummaryCard';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCurrency } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CalendarDays, CircleDollarSign, Clock } from 'lucide-react';

interface CashFlowProps {
  installments: Installment[];
  loading?: boolean;
}

export function CashFlow({ installments, loading }: CashFlowProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalValue = installments.reduce((acc, i) => acc + (i.value || 0), 0);
  const paidInstallments = installments.filter(i => i.status === 'pago');
  const totalPaid = paidInstallments.reduce((acc, i) => acc + (i.value || 0), 0);
  const pendingInstallments = installments.filter(i => i.status !== 'pago');
  const totalPending = pendingInstallments.reduce((acc, i) => acc + (i.value || 0), 0);

  const overdueInstallments = pendingInstallments.filter(i => {
    if (!i.due_date) return false;
    const dueDate = new Date(i.due_date);
    return dueDate < today;
  });
  const totalOverdue = overdueInstallments.reduce((acc, i) => acc + (i.value || 0), 0);

  const getStatus = (installment: Installment): 'pago' | 'pendente' | 'parcial' => {
    if (installment.status === 'pago') return 'pago';
    if (!installment.due_date) return 'pendente';
    const dueDate = new Date(installment.due_date);
    return dueDate < today ? 'parcial' : 'pendente';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Recebíveis"
          value={formatCurrency(totalValue)}
          subtitle={`${installments.length} parcelas`}
        />
        <SummaryCard
          title="Recebido"
          value={formatCurrency(totalPaid)}
          subtitle={`${paidInstallments.length} parcelas`}
          variant="success"
        />
        <SummaryCard
          title="A Receber"
          value={formatCurrency(totalPending)}
          subtitle={`${pendingInstallments.length} parcelas`}
          variant="primary"
        />
        <SummaryCard
          title="Atrasados"
          value={formatCurrency(totalOverdue)}
          subtitle={`${overdueInstallments.length} parcelas`}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Cronograma de Recebíveis
          </h2>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Ordenado por vencimento
          </p>
        </div>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Carregando...
          </div>
        ) : installments.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground border border-border">
            <CircleDollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma parcela cadastrada</p>
          </div>
        ) : (
          <div className="border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs uppercase tracking-wide font-semibold">
                    Parcela
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wide font-semibold">
                    Vencimento
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wide font-semibold text-right">
                    Valor
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wide font-semibold text-center">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installments.map((installment) => (
                  <TableRow key={installment.id}>
                    <TableCell className="font-mono text-sm">
                      {installment.installment_number}ª
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">
                          {installment.due_date
                            ? new Date(installment.due_date).toLocaleDateString('pt-BR')
                            : '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(installment.value)}
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={getStatus(installment)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="p-4 bg-muted/30 border border-border">
        <h3 className="text-sm font-semibold mb-2">Legenda</h3>
        <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <StatusBadge status="pago" />
            <span>Pago</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status="pendente" />
            <span>Pendente</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status="parcial" />
            <span>Atrasado</span>
          </div>
        </div>
      </div>
    </div>
  );
}
