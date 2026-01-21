import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Permission, AVAILABLE_PERMISSIONS } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';

interface TeamMember {
  user_id: string;
  role: string;
  profile: {
    full_name: string | null;
    email: string | null;
  } | null;
}

interface EditPermissionsDialogProps {
  member: TeamMember | null;
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const roleLabels: Record<string, string> = {
  admin: 'Gerente',
  manager: 'Auxiliar',
  seller: 'Vendedor',
  representative: 'Representante',
};

export function EditPermissionsDialog({ member, organizationId, onClose, onSuccess }: EditPermissionsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [originalPermissions, setOriginalPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    if (member) {
      fetchUserPermissions();
    }
  }, [member]);

  const fetchUserPermissions = async () => {
    if (!member) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('permission')
        .eq('user_id', member.user_id)
        .eq('organization_id', organizationId);

      if (error) throw error;

      const userPerms = (data?.map(p => p.permission) || []) as Permission[];
      setPermissions(userPerms);
      setOriginalPermissions(userPerms);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as permissões.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permission: Permission) => {
    if (permissions.includes(permission)) {
      setPermissions(permissions.filter(p => p !== permission));
    } else {
      setPermissions([...permissions, permission]);
    }
  };

  const handleSave = async () => {
    if (!member) return;

    setSaving(true);
    try {
      // Calculate which permissions to add and remove
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

      toast({
        title: 'Permissões atualizadas',
        description: `As permissões de ${member.profile?.full_name || 'membro'} foram atualizadas.`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as permissões.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify([...permissions].sort()) !== JSON.stringify([...originalPermissions].sort());

  // Admin role always has all permissions
  const isAdmin = member?.role === 'admin';

  return (
    <Dialog open={!!member} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Permissões</DialogTitle>
          <DialogDescription>
            Configure as permissões de{' '}
            <strong>{member?.profile?.full_name || member?.profile?.email}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Role badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Cargo:</span>
            <Badge variant="secondary">
              {roleLabels[member?.role || ''] || member?.role}
            </Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isAdmin ? (
            <div className="rounded-lg border bg-muted/30 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Gerentes (Admin) têm acesso total a todas as funcionalidades.
                As permissões não podem ser modificadas.
              </p>
            </div>
          ) : (
            <div className="space-y-2 border rounded-lg p-3">
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
                    disabled={saving}
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || loading || !hasChanges || isAdmin}
            className="gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
