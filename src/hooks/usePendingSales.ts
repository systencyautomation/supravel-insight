import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PendingSale {
  id: string;
  client_name: string | null;
  client_cnpj: string | null;
  nfe_number: string | null;
  nfe_key: string | null;
  total_value: number | null;
  table_value: number | null;
  uf_destiny: string | null;
  payment_method: string | null;
  status: string | null;
  over_price: number | null;
  pis_cofins: number | null;
  ir_csll: number | null;
  icms: number | null;
  commission_calculated: number | null;
  emission_date: string | null;
  created_at: string | null;
  produto_codigo: string | null;
  produto_descricao: string | null;
  produto_marca: string | null;
  produto_modelo: string | null; // Código FIPE
  produto_numero_serie: string | null;
  percentual_icms: number | null;
  percentual_comissao: number | null;
  over_price_liquido: number | null;
  valor_entrada: number | null;
  observacoes: string | null;
  emitente_uf: string | null;
  icms_tabela: number | null;
  ai_pre_calculated: boolean | null;
  valor_presente: number | null;
  entrada_calculada: number | null;
  analise_ia_status: string | null;
}

export function usePendingSales() {
  const { effectiveOrgId, user } = useAuth();

  const query = useQuery({
    queryKey: ['pending-sales', effectiveOrgId],
    queryFn: async () => {
      if (!effectiveOrgId) return [];
      
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('organization_id', effectiveOrgId)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PendingSale[];
    },
    enabled: !!effectiveOrgId && !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return {
    pendingSales: query.data || [],
    count: query.data?.length || 0,
    loading: query.isLoading,
    refetch: query.refetch,
    error: query.error,
  };
}
