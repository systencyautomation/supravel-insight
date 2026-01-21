import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AVAILABLE_PERMISSIONS, Permission } from '@/hooks/usePermissions';

type AppRole = 'manager' | 'seller' | 'representative';

interface RolePermissionsManagerProps {
  organizationId: string;
}

const roleLabels: Record<AppRole, string> = {
  manager: 'Gerente',
  seller: 'Vendedor',
  representative: 'Representante',
};

const editableRoles: AppRole[] = ['manager', 'seller', 'representative'];

export function RolePermissionsManager({ organizationId }: RolePermissionsManagerProps) {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<AppRole>('manager');
  const [permissions, setPermissions] = useState<Record<AppRole, string[]>>({
    manager: [],
    seller: [],
    representative: [],
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('role, permission')
        .eq('organization_id', organizationId)
        .in('role', editableRoles);

      if (error) throw error;

      const permsByRole: Record<AppRole, string[]> = {
        manager: [],
        seller: [],
        representative: [],
      };

      data?.forEach(row => {
        const role = row.role as AppRole;
        if (permsByRole[role]) {
          permsByRole[role].push(row.permission);
        }
      });

      setPermissions(permsByRole);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const togglePermission = async (permission: Permission, enabled: boolean) => {
    setUpdating(permission);
    
    try {
      if (enabled) {
        // Add permission
        const { error } = await supabase
          .from('role_permissions')
          .insert({
            organization_id: organizationId,
            role: selectedRole,
            permission,
          });

        if (error) throw error;

        setPermissions(prev => ({
          ...prev,
          [selectedRole]: [...prev[selectedRole], permission],
        }));
      } else {
        // Remove permission
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .eq('organization_id', organizationId)
          .eq('role', selectedRole)
          .eq('permission', permission);

        if (error) throw error;

        setPermissions(prev => ({
          ...prev,
          [selectedRole]: prev[selectedRole].filter(p => p !== permission),
        }));
      }

      toast({
        title: enabled ? 'Permissão adicionada' : 'Permissão removida',
        description: `${roleLabels[selectedRole]} ${enabled ? 'agora pode' : 'não pode mais'} ${AVAILABLE_PERMISSIONS.find(p => p.key === permission)?.label.toLowerCase()}.`,
      });
    } catch (error) {
      console.error('Error toggling permission:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a permissão.',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Permissões Padrão por Cargo</CardTitle>
        <CardDescription>
          Configure as permissões padrão que novos membros receberão ao serem adicionados com cada cargo.
          Membros existentes não são afetados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
          <TabsList className="grid w-full grid-cols-3">
            {editableRoles.map(role => (
              <TabsTrigger key={role} value={role}>
                {roleLabels[role]}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {editableRoles.map(role => (
            <TabsContent key={role} value={role} className="mt-4">
              <div className="space-y-3">
                {AVAILABLE_PERMISSIONS.map(perm => (
                  <div 
                    key={perm.key} 
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <p className="font-medium text-sm">{perm.label}</p>
                      <p className="text-xs text-muted-foreground">{perm.description}</p>
                    </div>
                    <Switch
                      checked={permissions[role]?.includes(perm.key)}
                      onCheckedChange={(checked) => togglePermission(perm.key, checked)}
                      disabled={updating === perm.key}
                    />
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
