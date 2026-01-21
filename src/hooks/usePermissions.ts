import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type Permission = 
  | 'view_dashboard'
  | 'view_sales'
  | 'approve_sales'
  | 'manage_inventory'
  | 'view_commissions'
  | 'manage_team'
  | 'manage_settings'
  | 'manage_integrations';

export const AVAILABLE_PERMISSIONS: { key: Permission; label: string; description: string }[] = [
  { key: 'view_dashboard', label: 'Ver Dashboard', description: 'Acesso ao dashboard e métricas' },
  { key: 'view_sales', label: 'Ver Vendas', description: 'Visualizar lista de vendas' },
  { key: 'approve_sales', label: 'Aprovar Vendas', description: 'Aprovar ou rejeitar vendas' },
  { key: 'manage_inventory', label: 'Gerenciar Estoque', description: 'Adicionar e editar itens' },
  { key: 'view_commissions', label: 'Ver Comissões', description: 'Visualizar comissões' },
  { key: 'manage_team', label: 'Gerenciar Equipe', description: 'Convidar e editar membros' },
  { key: 'manage_settings', label: 'Configurações', description: 'Editar configurações da org' },
  { key: 'manage_integrations', label: 'Integrações', description: 'Gerenciar integrações' },
];

export function usePermissions() {
  const { user, effectiveOrgId, userRoles, isMasterAdmin } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const userRole = userRoles.find(r => r.organization_id === effectiveOrgId)?.role;

  const fetchPermissions = useCallback(async () => {
    if (!effectiveOrgId || !userRole) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission')
        .eq('organization_id', effectiveOrgId)
        .eq('role', userRole);

      if (error) throw error;
      
      setPermissions(data?.map(p => p.permission) || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveOrgId, userRole]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback((permission: Permission): boolean => {
    if (isMasterAdmin) return true;
    if (userRole === 'super_admin' || userRole === 'saas_admin') return true;
    return permissions.includes(permission);
  }, [isMasterAdmin, userRole, permissions]);

  const refreshPermissions = useCallback(() => {
    setLoading(true);
    fetchPermissions();
  }, [fetchPermissions]);

  return { 
    permissions, 
    hasPermission, 
    loading, 
    userRole,
    refreshPermissions 
  };
}
