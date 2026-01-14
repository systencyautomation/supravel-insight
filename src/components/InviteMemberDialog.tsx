import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus } from 'lucide-react';

interface InviteMemberDialogProps {
  organizationId: string;
  organizationName: string;
}

type AppRole = 'manager' | 'seller' | 'representative';

export function InviteMemberDialog({ organizationId, organizationName }: InviteMemberDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [guestName, setGuestName] = useState('');
  const [role, setRole] = useState<AppRole>('seller');
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) {
      toast({
        title: 'Email obrigatório',
        description: 'Por favor, informe o email do convidado.',
        variant: 'destructive',
      });
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      // Create invitation record
      const { data: invitation, error: insertError } = await supabase
        .from('member_invitations')
        .insert({
          email: email.trim().toLowerCase(),
          guest_name: guestName.trim() || null,
          organization_id: organizationId,
          invited_by: user.id,
          role: role,
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          toast({
            title: 'Convite já existe',
            description: 'Já existe um convite pendente para este email.',
            variant: 'destructive',
          });
          return;
        }
        throw insertError;
      }

      // Get inviter profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      const inviterName = profile?.full_name || user.email || 'Um administrador';
      const inviteLink = `${window.location.origin}/join?token=${invitation.token}`;

      // Send invitation email
      const { error: emailError } = await supabase.functions.invoke('send-member-invitation', {
        body: {
          email: email.trim().toLowerCase(),
          guestName: guestName.trim() || null,
          organizationName,
          inviterName,
          inviteLink,
          role,
        },
      });

      if (emailError) {
        console.error('Error sending email:', emailError);
        // Still show success since invitation was created
        toast({
          title: 'Convite criado',
          description: 'O convite foi criado, mas houve um problema ao enviar o email. O link pode ser compartilhado manualmente.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Convite enviado!',
          description: `Um email foi enviado para ${email} com instruções para acessar a organização.`,
        });
      }

      setOpen(false);
      setEmail('');
      setGuestName('');
      setRole('seller');
    } catch (error) {
      console.error('Error creating invitation:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o convite. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const roleLabels: Record<AppRole, string> = {
    manager: 'Gerente',
    seller: 'Vendedor',
    representative: 'Representante',
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Convidar Membro
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar Membro</DialogTitle>
          <DialogDescription>
            Envie um convite para adicionar um novo membro à sua equipe em {organizationName}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guestName">Nome do convidado (opcional)</Label>
            <Input
              id="guestName"
              placeholder="Nome do novo membro"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Cargo</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">{roleLabels.manager}</SelectItem>
                <SelectItem value="seller">{roleLabels.seller}</SelectItem>
                <SelectItem value="representative">{roleLabels.representative}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleInvite} disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Enviar Convite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
