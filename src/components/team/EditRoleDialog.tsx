import { useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  admin: 'Administrador',
  manager: 'Gerente',
  seller: 'Vendedor',
  representative: 'Representante',
};

const roleOrder: AppRole[] = ['admin', 'manager', 'seller', 'representative'];

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
  const [newRole, setNewRole] = useState<string>(member?.role || '');
  const [updating, setUpdating] = useState(false);

  // Determine which roles the current user can assign
  const getAvailableRoles = (): AppRole[] => {
    // Admin can assign all roles except admin (to prevent giving admin to others easily)
    if (currentUserRole === 'admin') {
      return ['manager', 'seller', 'representative'];
    }
    // Manager can only assign seller and representative
    if (currentUserRole === 'manager') {
      return ['seller', 'representative'];
    }
    return [];
  };

  const handleUpdateRole = async () => {
    if (!member || !newRole || newRole === member.role) return;
    
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole as AppRole })
        .eq('user_id', member.user_id)
        .eq('organization_id', organizationId);

      if (error) throw error;

      toast({
        title: 'Cargo atualizado',
        description: `O cargo de ${member.profile?.full_name || member.profile?.email} foi alterado para ${roleLabels[newRole]}.`,
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o cargo.',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const availableRoles = getAvailableRoles();

  return (
    <Dialog open={!!member} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar Cargo</DialogTitle>
          <DialogDescription>
            Alterar cargo de {member?.profile?.full_name || member?.profile?.email}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Cargo atual</Label>
            <div>
              <Badge variant={getRoleBadgeVariant(member?.role || '')}>
                {roleLabels[member?.role || ''] || member?.role}
              </Badge>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Novo cargo</Label>
            <Select value={newRole} onValueChange={setNewRole}>
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
            {member?.role === 'admin' && (
              <p className="text-xs text-muted-foreground">
                Não é possível rebaixar um administrador.
              </p>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleUpdateRole} 
            disabled={updating || newRole === member?.role || !newRole || member?.role === 'admin'}
          >
            {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
