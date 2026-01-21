import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Sale {
  id: string;
  client_name: string | null;
  client_cnpj: string | null;
  nfe_number: string | null;
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
  internal_seller_id: string | null;
  representative_id: string | null;
  emission_date: string | null;
  created_at: string | null;
  // Additional fields
  produto_modelo: string | null;
  produto_descricao: string | null;
  produto_marca: string | null;
  produto_codigo: string | null;
  produto_numero_serie: string | null;
  percentual_comissao: number | null;
  percentual_icms: number | null;
  valor_entrada: number | null;
  over_price_liquido: number | null;
  observacoes: string | null;
  motivo_rejeicao: string | null;
  aprovado_por: string | null;
  aprovado_em: string | null;
}

export interface InventoryItem {
  id: string;
  model_name: string;
  internal_code: string | null;
  base_price: number | null;
  base_commission_pct: number | null;
  quantity: number | null;
}

export interface Installment {
  id: string;
  sale_id: string;
  installment_number: number;
  value: number;
  due_date: string | null;
  status: string | null;
  paid_at: string | null;
}

export function useOrganizationData() {
  const { effectiveOrgId, user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !effectiveOrgId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      const [salesResult, inventoryResult, installmentsResult] = await Promise.all([
        supabase
          .from('sales')
          .select('*')
          .eq('organization_id', effectiveOrgId)
          .order('created_at', { ascending: false }),
        supabase
          .from('inventory')
          .select('*')
          .eq('organization_id', effectiveOrgId)
          .order('model_name'),
        supabase
          .from('installments')
          .select('*')
          .eq('organization_id', effectiveOrgId)
          .order('due_date')
      ]);

      if (salesResult.data) setSales(salesResult.data);
      if (inventoryResult.data) setInventory(inventoryResult.data);
      if (installmentsResult.data) setInstallments(installmentsResult.data);

      setLoading(false);
    };

    fetchData();
  }, [user, effectiveOrgId]);

  const refetch = async () => {
    if (!effectiveOrgId) return;

    const [salesResult, inventoryResult, installmentsResult] = await Promise.all([
      supabase.from('sales').select('*').eq('organization_id', effectiveOrgId),
      supabase.from('inventory').select('*').eq('organization_id', effectiveOrgId),
      supabase.from('installments').select('*').eq('organization_id', effectiveOrgId)
    ]);

    if (salesResult.data) setSales(salesResult.data);
    if (inventoryResult.data) setInventory(inventoryResult.data);
    if (installmentsResult.data) setInstallments(installmentsResult.data);
  };

  return { sales, inventory, installments, loading, refetch };
}
