import { useState, useMemo } from 'react';
import { startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { SaleWithCalculations } from '@/hooks/useSalesWithCalculations';
import { useRecebimentosData, Recebimento } from '@/hooks/useRecebimentosData';
import { RecebimentosFilters, RecebimentosFilterValues } from './RecebimentosFilters';
import { RecebimentosTable } from './RecebimentosTable';
import { supabase } from '@/integrations/supabase/client';

interface EmpresaRecebimentosProps {
  sales: SaleWithCalculations[];
  loading: boolean;
  onRefresh: () => void;
}

const defaultFilters: RecebimentosFilterValues = {
  dataInicio: startOfMonth(new Date()),
  dataFim: endOfMonth(new Date()),
  cliente: '',
  nf: '',
  produto: '',
  status: 'todos',
};

export function EmpresaRecebimentos({ sales, loading, onRefresh }: EmpresaRecebimentosProps) {
  const [filters, setFilters] = useState<RecebimentosFilterValues>(defaultFilters);
  const { recebimentos, totalPendente } = useRecebimentosData(sales);

  // Aplicar filtros
  const filteredRecebimentos = useMemo(() => {
    return recebimentos.filter((r) => {
      // Filtro de data
      if (filters.dataInicio && filters.dataFim) {
        const dataRecebimento = startOfDay(r.data);
        const inicio = startOfDay(filters.dataInicio);
        const fim = endOfDay(filters.dataFim);
        
        if (!isWithinInterval(dataRecebimento, { start: inicio, end: fim })) {
          return false;
        }
      }

      // Filtro de cliente
      if (filters.cliente && !r.cliente.toLowerCase().includes(filters.cliente.toLowerCase())) {
        return false;
      }

      // Filtro de NF
      if (filters.nf && !r.nf.includes(filters.nf)) {
        return false;
      }

      // Filtro de produto
      if (filters.produto && !r.produto.toLowerCase().includes(filters.produto.toLowerCase())) {
        return false;
      }

      // Filtro de status
      if (filters.status !== 'todos' && r.status !== filters.status) {
        return false;
      }

      return true;
    });
  }, [recebimentos, filters]);

  // Total pendente filtrado
  const totalPendenteFiltrado = useMemo(() => {
    return filteredRecebimentos
      .filter(r => r.status === 'pendente')
      .reduce((acc, r) => acc + r.valor, 0);
  }, [filteredRecebimentos]);

  const handleClearFilters = () => {
    setFilters(defaultFilters);
  };

  const handleStatusChange = async (recebimento: Recebimento, newStatus: 'pago' | 'pendente') => {
    try {
      if (recebimento.tipo === 'parcela' && recebimento.installment_id) {
        // Atualizar status da parcela
        const { error } = await supabase
          .from('installments')
          .update({
            status: newStatus,
            paid_at: newStatus === 'pago' ? new Date().toISOString() : null,
          })
          .eq('id', recebimento.installment_id);

        if (error) throw error;
      } else {
        // Para entrada, atualizar o status da venda
        const { error } = await supabase
          .from('sales')
          .update({
            status: newStatus === 'pago' ? 'pago' : 'aprovado',
          })
          .eq('id', recebimento.sale_id);

        if (error) throw error;
      }

      toast.success(`Status atualizado para ${newStatus === 'pago' ? 'Pago' : 'Pendente'}`);
      onRefresh();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com total pendente */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Recebimentos</h2>
          <Button variant="ghost" size="icon" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-right">
          <span className="text-sm text-muted-foreground uppercase tracking-wide">
            Valor Pendente a Receber
          </span>
          <p className="text-2xl font-bold text-primary">
            {formatCurrency(totalPendenteFiltrado)}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <RecebimentosFilters
        filters={filters}
        onFiltersChange={setFilters}
        onClear={handleClearFilters}
      />

      {/* Contador de resultados */}
      <div className="text-sm text-muted-foreground">
        {filteredRecebimentos.length} recebimento(s) encontrado(s)
      </div>

      {/* Tabela */}
      <RecebimentosTable
        recebimentos={filteredRecebimentos}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
