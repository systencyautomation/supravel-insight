import { useMemo } from 'react';
import { SaleWithCalculations } from './useSalesWithCalculations';

export interface Recebimento {
  id: string;
  sale_id: string;
  installment_id?: string;
  tipo: 'entrada' | 'parcela';
  numero_parcela?: number;
  data: Date;
  nf: string;
  cliente: string;
  produto: string;
  valor: number;
  percentual_comissao: number;
  valor_comissao: number;
  status: 'pago' | 'pendente';
}

export interface RecebimentosResult {
  recebimentos: Recebimento[];
  totalPendente: number;
  totalPago: number;
  totalGeral: number;
}

export function useRecebimentosData(sales: SaleWithCalculations[]): RecebimentosResult {
  return useMemo(() => {
    const recebimentos: Recebimento[] = [];

    sales.forEach((sale) => {
      // Só processar vendas aprovadas ou pagas
      if (sale.status !== 'aprovado' && sale.status !== 'pago') {
        return;
      }

      const percentualComissao = Number(sale.percentual_comissao) || sale.percentualComissaoCalculado || 0;
      const nf = sale.nfe_number || '';
      const cliente = sale.client_name || '';
      const produto = sale.produto_modelo || sale.produto_descricao || '';

      // 1. Criar recebimento de ENTRADA (valor_entrada ou entradaCalculada)
      const valorEntrada = Number(sale.valor_entrada) || sale.entradaCalculada || 0;
      
      if (valorEntrada > 0) {
        const valorComissaoEntrada = valorEntrada * (percentualComissao / 100);
        
        recebimentos.push({
          id: `${sale.id}-entrada`,
          sale_id: sale.id,
          tipo: 'entrada',
          data: new Date(sale.emission_date || sale.created_at || new Date()),
          nf,
          cliente,
          produto,
          valor: valorEntrada,
          percentual_comissao: percentualComissao,
          valor_comissao: valorComissaoEntrada,
          status: sale.status === 'pago' ? 'pago' : 'pendente',
        });
      }

      // 2. Criar recebimentos para cada PARCELA
      if (sale.installments && sale.installments.length > 0) {
        sale.installments.forEach((inst, index) => {
          const valorParcela = Number(inst.value) || 0;
          const valorComissaoParcela = valorParcela * (percentualComissao / 100);
          
          recebimentos.push({
            id: `${sale.id}-parcela-${inst.id}`,
            sale_id: sale.id,
            installment_id: inst.id,
            tipo: 'parcela',
            numero_parcela: inst.installment_number || index + 1,
            data: new Date(inst.due_date || sale.emission_date || new Date()),
            nf,
            cliente,
            produto,
            valor: valorParcela,
            percentual_comissao: percentualComissao,
            valor_comissao: valorComissaoParcela,
            status: inst.status === 'pago' ? 'pago' : 'pendente',
          });
        });
      }
    });

    // Ordenar por data
    recebimentos.sort((a, b) => a.data.getTime() - b.data.getTime());

    // Calcular totais
    const totalPendente = recebimentos
      .filter(r => r.status === 'pendente')
      .reduce((acc, r) => acc + r.valor, 0);

    const totalPago = recebimentos
      .filter(r => r.status === 'pago')
      .reduce((acc, r) => acc + r.valor, 0);

    const totalGeral = recebimentos.reduce((acc, r) => acc + r.valor, 0);

    return {
      recebimentos,
      totalPendente,
      totalPago,
      totalGeral,
    };
  }, [sales]);
}
