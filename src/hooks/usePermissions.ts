import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type Permission = 
  | 'view_dashboard'
  | 'view_sales'
  | 'approve_sales'
  | 'manage_inventory'
  | 'view_commissions'
  | 'view_all_commissions'
  | 'manage_team'
  | 'remove_members'
  | 'manage_settings'
  | 'manage_integrations'
  | 'view_linked_representatives';

export const AVAILABLE_PERMISSIONS: { key: Permission; label: string; description: string }[] = [
  { key: 'view_dashboard', label: 'Ver Dashboard', description: 'Acesso ao dashboard e métricas' },
  { key: 'view_sales', label: 'Ver Vendas', description: 'Visualizar vendas (próprias ou todas conforme cargo)' },
  { key: 'approve_sales', label: 'Aprovar Pendências', description: 'Aprovar ou rejeitar vendas pendentes' },
  { key: 'manage_inventory', label: 'Gerenciar Tabela', description: 'Adicionar e editar itens do estoque' },
  { key: 'view_commissions', label: 'Ver Próprias Comissões', description: 'Visualizar suas comissões' },
  { key: 'view_all_commissions', label: 'Ver Comissões de Outros', description: 'Visualizar comissões de toda a equipe' },
  { key: 'manage_team', label: 'Adicionar Membros', description: 'Convidar novos membros para a equipe' },
  { key: 'remove_members', label: 'Remover Membros', description: 'Remover membros da organização' },
  { key: 'manage_settings', label: 'Configurar SMTP/Email', description: 'Editar configurações de email e integrações' },
  { key: 'manage_integrations', label: 'Integrações', description: 'Gerenciar integrações externas' },
  { key: 'view_linked_representatives', label: 'Ver Reps Linkados', description: 'Visualizar representantes vinculados' },
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
