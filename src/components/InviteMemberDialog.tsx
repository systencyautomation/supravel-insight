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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, Mail, UserCog } from 'lucide-react';

interface InviteMemberDialogProps {
  organizationId: string;
  organizationName: string;
}

type AppRole = 'manager' | 'seller' | 'representative';

const roleLabels: Record<AppRole, string> = {
  manager: 'Gerente',
  seller: 'Vendedor',
  representative: 'Representante',
};

export function InviteMemberDialog({ organizationId, organizationName }: InviteMemberDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'invite' | 'direct'>('invite');
  
  // Invite form state
  const [email, setEmail] = useState('');
  const [guestName, setGuestName] = useState('');
  const [role, setRole] = useState<AppRole>('seller');
  const [loading, setLoading] = useState(false);

  // Direct create form state
  const [directEmail, setDirectEmail] = useState('');
  const [directName, setDirectName] = useState('');
  const [directPassword, setDirectPassword] = useState('');
  const [directConfirmPassword, setDirectConfirmPassword] = useState('');
  const [directRole, setDirectRole] = useState<AppRole>('seller');
  const [directLoading, setDirectLoading] = useState(false);

  const resetForms = () => {
    setEmail('');
    setGuestName('');
    setRole('seller');
    setDirectEmail('');
    setDirectName('');
    setDirectPassword('');
    setDirectConfirmPassword('');
    setDirectRole('seller');
  };

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

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      const inviterName = profile?.full_name || user.email || 'Um administrador';
      const inviteLink = `${window.location.origin}/join?token=${invitation.token}`;

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
      resetForms();
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

  const handleDirectCreate = async () => {
    // Validations
    if (!directEmail.trim()) {
      toast({
        title: 'Email obrigatório',
        description: 'Por favor, informe o email do membro.',
        variant: 'destructive',
      });
      return;
    }

    if (!directName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, informe o nome do membro.',
        variant: 'destructive',
      });
      return;
    }

    if (!directPassword) {
      toast({
        title: 'Senha obrigatória',
        description: 'Por favor, defina uma senha para o membro.',
        variant: 'destructive',
      });
      return;
    }

    if (directPassword.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    if (directPassword !== directConfirmPassword) {
      toast({
        title: 'Senhas não coincidem',
        description: 'A confirmação de senha deve ser igual à senha.',
        variant: 'destructive',
      });
      return;
    }

    if (!user) return;

    setDirectLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-member-direct', {
        body: {
          email: directEmail.trim().toLowerCase(),
          password: directPassword,
          fullName: directName.trim(),
          role: directRole,
          organizationId,
        },
      });

      if (error) {
        console.error('Error creating member:', error);
        toast({
          title: 'Erro',
          description: error.message || 'Não foi possível criar o membro. Tente novamente.',
          variant: 'destructive',
        });
        return;
      }

      if (data?.error) {
        toast({
          title: 'Erro',
          description: data.error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Membro criado!',
        description: `${directName} foi adicionado à equipe e já pode fazer login.`,
      });

      setOpen(false);
      resetForms();
    } catch (error) {
      console.error('Error creating member:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o membro. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setDirectLoading(false);
    }
  };

  const isLoading = loading || directLoading;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForms(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Adicionar Membro
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Membro</DialogTitle>
          <DialogDescription>
            Adicione um novo membro à equipe de {organizationName}.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'invite' | 'direct')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invite" className="gap-2" disabled={isLoading}>
              <Mail className="h-4 w-4" />
              Enviar Convite
            </TabsTrigger>
            <TabsTrigger value="direct" className="gap-2" disabled={isLoading}>
              <UserCog className="h-4 w-4" />
              Criar Diretamente
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="invite" className="mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email *</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-guestName">Nome do convidado (opcional)</Label>
                <Input
                  id="invite-guestName"
                  placeholder="Nome do novo membro"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Cargo</Label>
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
              <p className="text-sm text-muted-foreground">
                Um email será enviado com um link para o convidado criar sua conta.
              </p>
            </div>
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={handleInvite} disabled={loading} className="gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Enviar Convite
              </Button>
            </DialogFooter>
          </TabsContent>
          
          <TabsContent value="direct" className="mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="direct-email">Email *</Label>
                <Input
                  id="direct-email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={directEmail}
                  onChange={(e) => setDirectEmail(e.target.value)}
                  disabled={directLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="direct-name">Nome completo *</Label>
                <Input
                  id="direct-name"
                  placeholder="Nome do membro"
                  value={directName}
                  onChange={(e) => setDirectName(e.target.value)}
                  disabled={directLoading}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="direct-password">Senha *</Label>
                  <Input
                    id="direct-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={directPassword}
                    onChange={(e) => setDirectPassword(e.target.value)}
                    disabled={directLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="direct-confirm">Confirmar senha *</Label>
                  <Input
                    id="direct-confirm"
                    type="password"
                    placeholder="Repita a senha"
                    value={directConfirmPassword}
                    onChange={(e) => setDirectConfirmPassword(e.target.value)}
                    disabled={directLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="direct-role">Cargo</Label>
                <Select value={directRole} onValueChange={(v) => setDirectRole(v as AppRole)} disabled={directLoading}>
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
              <p className="text-sm text-muted-foreground">
                O membro será criado imediatamente e poderá fazer login com as credenciais definidas.
              </p>
            </div>
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={directLoading}>
                Cancelar
              </Button>
              <Button onClick={handleDirectCreate} disabled={directLoading} className="gap-2">
                {directLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar Membro
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
