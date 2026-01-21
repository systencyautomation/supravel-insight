import { useState, useEffect } from 'react';
import { Loader2, ChevronDown, ChevronUp, Check, RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Permission, AVAILABLE_PERMISSIONS } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';

type AppRole = 'admin' | 'manager' | 'seller' | 'representative';

interface TeamMember {
  user_id: string;
  role: string;
  profile: {
    full_name: string | null;
    email: string | null;
  } | null;
}

interface EditRoleDialogProps {
  member: TeamMember | null;
  organizationId: string;
  currentUserRole: string | undefined;
  onClose: () => void;
  onSuccess: () => void;
}

const roleLabels: Record<string, string> = {
  admin: 'Gerente',
  manager: 'Auxiliar',
  seller: 'Vendedor',
  representative: 'Representante',
};

// Default permissions for each role when no org-specific config exists
const defaultRolePermissions: Record<AppRole, Permission[]> = {
  admin: AVAILABLE_PERMISSIONS.map(p => p.key),
  manager: [
    'view_dashboard',
    'view_sales',
    'approve_sales',
    'manage_inventory',
    'view_commissions',
    'view_all_commissions',
    'manage_team',
    'view_linked_representatives',
  ],
  seller: [
    'view_dashboard',
    'view_sales',
    'view_commissions',
    'view_linked_representatives',
  ],
  representative: [
    'view_commissions',
  ],
};

function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
  switch (role) {
    case 'admin':
      return 'default';
    case 'manager':
      return 'secondary';
    default:
      return 'outline';
  }
}

export function EditRoleDialog({ 
  member, 
  organizationId, 
  currentUserRole,
  onClose, 
  onSuccess 
}: EditRoleDialogProps) {
  const { toast } = useToast();
  const [newRole, setNewRole] = useState<AppRole>((member?.role as AppRole) || 'seller');
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Permissions state
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [originalPermissions, setOriginalPermissions] = useState<Permission[]>([]);
  const [roleTemplates, setRoleTemplates] = useState<Record<AppRole, Permission[]>>(defaultRolePermissions);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load data when member changes
  useEffect(() => {
    if (member) {
      setNewRole(member.role as AppRole);
      setShowAdvanced(false);
      fetchData();
    }
  }, [member]);

  const fetchData = async () => {
    if (!member) return;
    
    setLoading(true);
    try {
      // Fetch organization's role permission templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('role_permissions')
        .select('role, permission')
        .eq('organization_id', organizationId);

      if (templatesError) throw templatesError;

      if (templatesData && templatesData.length > 0) {
        const templates: Record<string, Permission[]> = {};
        templatesData.forEach(row => {
          if (!templates[row.role]) {
            templates[row.role] = [];
          }
          templates[row.role].push(row.permission as Permission);
        });
        
        setRoleTemplates(prev => ({
          ...prev,
          ...templates,
        }));
      }

      // Fetch user's current permissions
      const { data: userPermsData, error: userPermsError } = await supabase
        .from('user_permissions')
        .select('permission')
        .eq('user_id', member.user_id)
        .eq('organization_id', organizationId);

      if (userPermsError) throw userPermsError;

      const userPerms = (userPermsData?.map(p => p.permission) || []) as Permission[];
      setPermissions(userPerms);
      setOriginalPermissions(userPerms);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Determine which roles the current user can assign
  const getAvailableRoles = (): AppRole[] => {
    if (currentUserRole === 'admin') {
      return ['admin', 'manager', 'seller', 'representative'];
    }
    if (currentUserRole === 'manager') {
      return ['seller', 'representative'];
    }
    return [];
  };

  const handleRoleChange = (role: AppRole) => {
    setNewRole(role);
    
    // When changing role, apply template permissions for that role
    if (role === 'admin') {
      setPermissions(AVAILABLE_PERMISSIONS.map(p => p.key));
      setShowAdvanced(false);
    } else {
      const templatePerms = roleTemplates[role] || defaultRolePermissions[role];
      setPermissions(templatePerms);
    }
  };

  const togglePermission = (permission: Permission) => {
    if (newRole === 'admin') return;
    
    if (permissions.includes(permission)) {
      setPermissions(permissions.filter(p => p !== permission));
    } else {
      setPermissions([...permissions, permission]);
    }
  };

  const handleResetToDefault = () => {
    const templatePerms = roleTemplates[newRole] || defaultRolePermissions[newRole];
    setPermissions([...templatePerms]);
  };

  const handleSave = async () => {
    if (!member) return;
    
    setUpdating(true);
    try {
      // 1. Update role if changed
      if (newRole !== member.role) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', member.user_id)
          .eq('organization_id', organizationId);

        if (roleError) throw roleError;
      }

      // 2. Sync permissions (only for non-admin roles)
      if (newRole !== 'admin') {
        const toAdd = permissions.filter(p => !originalPermissions.includes(p));
        const toRemove = originalPermissions.filter(p => !permissions.includes(p));

        // Remove permissions
        if (toRemove.length > 0) {
          const { error: deleteError } = await supabase
            .from('user_permissions')
            .delete()
            .eq('user_id', member.user_id)
            .eq('organization_id', organizationId)
            .in('permission', toRemove);

          if (deleteError) throw deleteError;
        }

        // Add permissions
        if (toAdd.length > 0) {
          const rows = toAdd.map(permission => ({
            user_id: member.user_id,
            organization_id: organizationId,
            permission,
          }));

          const { error: insertError } = await supabase
            .from('user_permissions')
            .insert(rows);

          if (insertError) throw insertError;
        }
      } else {
        // If promoting to admin, clear all individual permissions (admin has all by default)
        if (originalPermissions.length > 0) {
          const { error: clearError } = await supabase
            .from('user_permissions')
            .delete()
            .eq('user_id', member.user_id)
            .eq('organization_id', organizationId);

          if (clearError) throw clearError;
        }
      }

      toast({
        title: 'Alterações salvas',
        description: `As configurações de ${member.profile?.full_name || 'membro'} foram atualizadas.`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as alterações.',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const availableRoles = getAvailableRoles();
  const isAdmin = member?.role === 'admin';
  
  const roleChanged = newRole !== member?.role;
  const permissionsChanged = JSON.stringify([...permissions].sort()) !== JSON.stringify([...originalPermissions].sort());
  const hasChanges = roleChanged || permissionsChanged;

  const isCustomized = newRole !== 'admin' && 
    JSON.stringify([...permissions].sort()) !== 
    JSON.stringify([...(roleTemplates[newRole] || [])].sort());

  return (
    <Dialog open={!!member} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Alterar Cargo e Permissões</DialogTitle>
          <DialogDescription>
            Configurar {member?.profile?.full_name || member?.profile?.email}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isAdmin ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Cargo atual:</span>
              <Badge variant="default">{roleLabels[member?.role || '']}</Badge>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Gerentes (Admin) têm acesso total a todas as funcionalidades.
                O cargo e permissões não podem ser modificados.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current role badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Cargo atual:</span>
              <Badge variant={getRoleBadgeVariant(member?.role || '')}>
                {roleLabels[member?.role || ''] || member?.role}
              </Badge>
            </div>

            {/* Role selector */}
            <div className="space-y-2">
              <Label>Novo cargo</Label>
              <Select value={newRole} onValueChange={(v) => handleRoleChange(v as AppRole)} disabled={updating}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cargo" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map(role => (
                    <SelectItem key={role} value={role}>
                      {roleLabels[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Permission preview */}
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  {newRole === 'admin' ? 'Acesso total (todas as permissões)' : 'Permissões'}
                </p>
                {isCustomized && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      Customizado
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      onClick={handleResetToDefault}
                      disabled={updating}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Resetar
                    </Button>
                  </div>
                )}
              </div>
              
              {newRole !== 'admin' && (
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_PERMISSIONS.filter(p => permissions.includes(p.key)).map(perm => (
                    <span
                      key={perm.key}
                      className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-md"
                    >
                      <Check className="h-3 w-3" />
                      {perm.label}
                    </span>
                  ))}
                  {permissions.length === 0 && (
                    <span className="text-xs text-muted-foreground">Nenhuma permissão selecionada</span>
                  )}
                </div>
              )}
            </div>

            {/* Advanced toggle */}
            {newRole !== 'admin' && (
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  disabled={updating}
                >
                  {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  Avançado (customizar permissões)
                </Button>

                {showAdvanced && (
                  <div className="mt-3 space-y-2 border rounded-lg p-3">
                    {AVAILABLE_PERMISSIONS.map(perm => (
                      <div
                        key={perm.key}
                        className={cn(
                          "flex items-center space-x-3 p-2 rounded-md transition-colors",
                          permissions.includes(perm.key) ? "bg-primary/5" : "hover:bg-muted/50"
                        )}
                      >
                        <Checkbox
                          id={`edit-perm-${perm.key}`}
                          checked={permissions.includes(perm.key)}
                          onCheckedChange={() => togglePermission(perm.key)}
                          disabled={updating}
                        />
                        <div className="flex-1">
                          <Label 
                            htmlFor={`edit-perm-${perm.key}`} 
                            className="text-sm font-medium cursor-pointer"
                          >
                            {perm.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">{perm.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={updating}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={updating || loading || !hasChanges || isAdmin}
            className="gap-2"
          >
            {updating && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
