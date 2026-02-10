import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EditableSale {
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
  produto_modelo: string | null;
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

export interface EditableSaleInstallment {
  id: string;
  sale_id: string;
  installment_number: number;
  value: number;
  due_date: string | null;
  status: string | null;
  paid_at: string | null;
}

export function useEditableSale(saleId: string | null) {
  const { effectiveOrgId, user } = useAuth();

  const saleQuery = useQuery({
    queryKey: ['editable-sale', saleId, effectiveOrgId],
    queryFn: async () => {
      if (!saleId || !effectiveOrgId) return null;
      
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('id', saleId)
        .eq('organization_id', effectiveOrgId)
        .single();

      if (error) throw error;
      return data as EditableSale;
    },
    enabled: !!saleId && !!effectiveOrgId && !!user,
  });

  const installmentsQuery = useQuery({
    queryKey: ['editable-sale-installments', saleId],
    queryFn: async () => {
      if (!saleId) return [];
      
      const { data, error } = await supabase
        .from('installments')
        .select('*')
        .eq('sale_id', saleId)
        .order('installment_number', { ascending: true });

      if (error) throw error;
      return (data || []) as EditableSaleInstallment[];
    },
    enabled: !!saleId && !!user,
  });

  return {
    sale: saleQuery.data || null,
    installments: installmentsQuery.data || [],
    loading: saleQuery.isLoading || installmentsQuery.isLoading,
    error: saleQuery.error || installmentsQuery.error,
    refetch: async () => {
      await Promise.all([saleQuery.refetch(), installmentsQuery.refetch()]);
    },
  };
}
