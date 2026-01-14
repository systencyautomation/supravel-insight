import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  Plus, 
  LogOut, 
  Eye, 
  Mail, 
  User, 
  Send,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { z } from 'zod';

interface Organization {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  created_at: string;
}

interface Invitation {
  id: string;
  email: string;
  organization_name: string | null;
  status: string;
  created_at: string;
  token: string;
  last_sent_at: string;
}

const orgSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  slug: z.string().min(2, 'Slug deve ter pelo menos 2 caracteres').max(50).regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
  adminEmail: z.string().email('Email inválido'),
  adminName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  adminPassword: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres')
});

const inviteSchema = z.object({
  email: z.string().email('Email inválido'),
  organizationName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100).optional()
});

export default function MasterDashboard() {
  const { user, loading, isMasterAdmin, impersonatedOrgName, setImpersonatedOrg, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createTab, setCreateTab] = useState<'manual' | 'invite'>('manual');

  // Manual creation form
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSlug, setNewOrgSlug] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteOrgName, setInviteOrgName] = useState('');
  const [sending, setSending] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (!loading && user && !isMasterAdmin) {
      navigate('/');
      return;
    }

    if (user && isMasterAdmin) {
      fetchData();
    }
  }, [user, loading, isMasterAdmin, navigate]);

  const fetchData = async () => {
    setLoadingData(true);
    await Promise.all([fetchOrganizations(), fetchInvitations()]);
    setLoadingData(false);
  };

  const fetchOrganizations = async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrganizations(data);
    }
  };

  const fetchInvitations = async () => {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setInvitations(data);
    }
  };

  const handleImpersonate = (org: Organization) => {
    setImpersonatedOrg(org.id, org.name);
    toast({
      title: 'Modo Suporte Ativado',
      description: `Visualizando como ${org.name}`,
    });
    navigate('/');
  };

  const exitImpersonation = () => {
    setImpersonatedOrg(null, null);
    toast({
      title: 'Modo Suporte Desativado',
      description: 'Voltando à visão Master',
    });
  };

  const toggleActive = async (org: Organization) => {
    const { error } = await supabase
      .from('organizations')
      .update({ active: !org.active })
      .eq('id', org.id);

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setOrganizations(orgs => 
        orgs.map(o => o.id === org.id ? { ...o, active: !o.active } : o)
      );
    }
  };

  const createOrganization = async () => {
    const validation = orgSchema.safeParse({
      name: newOrgName,
      slug: newOrgSlug,
      adminEmail,
      adminName,
      adminPassword
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setCreating(true);

    try {
      // 1. Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: newOrgName, slug: newOrgSlug })
        .select()
        .single();

      if (orgError) throw orgError;

      // 2. Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: adminName }
        }
      });

      if (authError) throw authError;

      // 3. Assign admin role to user for this organization
      if (authData.user) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: 'admin',
            organization_id: org.id
          });

        if (roleError) throw roleError;
      }

      toast({
        title: 'Organização Criada',
        description: `${newOrgName} foi criada com sucesso. O admin receberá um email de confirmação.`,
      });

      setDialogOpen(false);
      resetForm();
      fetchOrganizations();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  const sendInvite = async () => {
    const validation = inviteSchema.safeParse({
      email: inviteEmail,
      organizationName: inviteOrgName || undefined
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSending(true);

    try {
      // Create invitation record
      const { data: invite, error: inviteError } = await supabase
        .from('invitations')
        .insert({
          email: inviteEmail,
          organization_name: inviteOrgName || null,
          status: 'pendente'
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Generate invite link
      const inviteLink = `${window.location.origin}/onboarding?token=${invite.token}`;

      // Try to send email via edge function
      try {
        const { error: emailError } = await supabase.functions.invoke('send-invitation', {
          body: { email: inviteEmail, inviteLink, organizationName: inviteOrgName }
        });

        if (emailError) {
          console.warn('Email sending failed:', emailError);
          // Show link to copy manually
          toast({
            title: 'Convite Criado',
            description: `Link do convite: ${inviteLink}`,
          });
        } else {
          toast({
            title: 'Convite Enviado',
            description: `Email enviado para ${inviteEmail}`,
          });
        }
      } catch {
        // Edge function not deployed yet
        toast({
          title: 'Convite Criado',
          description: `Copie e envie este link: ${inviteLink}`,
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchInvitations();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setNewOrgName('');
    setNewOrgSlug('');
    setAdminEmail('');
    setAdminName('');
    setAdminPassword('');
    setInviteEmail('');
    setInviteOrgName('');
    setErrors({});
    setCreateTab('manual');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aceito':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'expirado':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-warning" />;
    }
  };

  const getResendCooldown = (lastSentAt: string): number => {
    const lastSent = new Date(lastSentAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSent.getTime()) / (1000 * 60);
    return Math.max(0, Math.ceil(3 - diffMinutes));
  };

  const resendInvite = async (invite: Invitation) => {
    const cooldown = getResendCooldown(invite.last_sent_at);
    
    if (cooldown > 0) {
      toast({
        title: 'Aguarde',
        description: `Você pode reenviar em ${cooldown} minuto(s)`,
        variant: 'destructive'
      });
      return;
    }
    
    setResendingId(invite.id);
    
    try {
      const inviteLink = `${window.location.origin}/onboarding?token=${invite.token}`;
      
      const { error: emailError } = await supabase.functions.invoke('send-invitation', {
        body: { 
          email: invite.email, 
          inviteLink, 
          organizationName: invite.organization_name 
        }
      });

      if (emailError) {
        throw emailError;
      }
      
      await supabase
        .from('invitations')
        .update({ last_sent_at: new Date().toISOString() })
        .eq('id', invite.id);
      
      toast({
        title: 'Convite Reenviado',
        description: `Email enviado para ${invite.email}`
      });
      
      fetchInvitations();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao reenviar convite',
        variant: 'destructive'
      });
    } finally {
      setResendingId(null);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground font-mono text-sm">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Building2 className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-lg font-medium text-foreground">Master Dashboard</h1>
                <p className="text-xs text-muted-foreground font-mono">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {impersonatedOrgName && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exitImpersonation}
                  className="text-xs"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Sair de {impersonatedOrgName}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border p-4">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Organizações</p>
            <p className="text-2xl font-medium text-foreground mt-1">{organizations.length}</p>
          </div>
          <div className="bg-card border border-border p-4">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Ativas</p>
            <p className="text-2xl font-medium text-success mt-1">
              {organizations.filter(o => o.active).length}
            </p>
          </div>
          <div className="bg-card border border-border p-4">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Convites Pendentes</p>
            <p className="text-2xl font-medium text-warning mt-1">
              {invitations.filter(i => i.status === 'pendente').length}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-medium text-foreground uppercase tracking-wide">Organizações</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Nova Organização
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Adicionar Organização</DialogTitle>
              </DialogHeader>
              
              <Tabs value={createTab} onValueChange={(v) => setCreateTab(v as 'manual' | 'invite')}>
                <TabsList className="w-full">
                  <TabsTrigger value="manual" className="flex-1 text-xs">
                    <User className="h-3 w-3 mr-1" />
                    Manual
                  </TabsTrigger>
                  <TabsTrigger value="invite" className="flex-1 text-xs">
                    <Mail className="h-3 w-3 mr-1" />
                    Convite
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="manual" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome da Empresa</Label>
                      <Input
                        value={newOrgName}
                        onChange={(e) => setNewOrgName(e.target.value)}
                        placeholder="Supravel Ltda"
                        className="text-sm"
                      />
                      {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Slug</Label>
                      <Input
                        value={newOrgSlug}
                        onChange={(e) => setNewOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                        placeholder="supravel"
                        className="text-sm font-mono"
                      />
                      {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground mb-3">Dados do Administrador</p>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Nome Completo</Label>
                        <Input
                          value={adminName}
                          onChange={(e) => setAdminName(e.target.value)}
                          placeholder="João Silva"
                          className="text-sm"
                        />
                        {errors.adminName && <p className="text-xs text-destructive">{errors.adminName}</p>}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Email</Label>
                        <Input
                          type="email"
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          placeholder="admin@empresa.com"
                          className="text-sm"
                        />
                        {errors.adminEmail && <p className="text-xs text-destructive">{errors.adminEmail}</p>}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Senha</Label>
                        <Input
                          type="password"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="••••••••"
                          className="text-sm"
                        />
                        {errors.adminPassword && <p className="text-xs text-destructive">{errors.adminPassword}</p>}
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={createOrganization} 
                    disabled={creating}
                    className="w-full text-sm"
                  >
                    {creating ? 'Criando...' : 'Criar Organização'}
                  </Button>
                </TabsContent>

                <TabsContent value="invite" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Email do Cliente</Label>
                      <Input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="cliente@empresa.com"
                        className="text-sm"
                      />
                      {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Nome da Empresa (opcional)</Label>
                      <Input
                        value={inviteOrgName}
                        onChange={(e) => setInviteOrgName(e.target.value)}
                        placeholder="Será preenchido pelo cliente"
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="bg-muted p-3 border border-border">
                    <p className="text-xs text-muted-foreground">
                      Um link único será gerado e enviado para o email informado. 
                      O cliente poderá completar o cadastro através deste link.
                    </p>
                  </div>

                  <Button 
                    onClick={sendInvite} 
                    disabled={sending}
                    className="w-full text-sm"
                  >
                    <Send className="h-3 w-3 mr-1" />
                    {sending ? 'Enviando...' : 'Enviar Convite'}
                  </Button>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

        {/* Organizations Table */}
        <div className="bg-card border border-border mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Empresa</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Slug</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Criada em</th>
                <th className="text-center px-4 py-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{org.name}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground text-xs">{org.slug}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(org.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={org.active}
                      onCheckedChange={() => toggleActive(org)}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleImpersonate(org)}
                      className="text-xs"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Visualizar
                    </Button>
                  </td>
                </tr>
              ))}
              {organizations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhuma organização cadastrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Invitations */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-medium text-foreground uppercase tracking-wide">Convites</h2>
        </div>

        <TooltipProvider>
          <div className="bg-card border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Empresa</th>
                  <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Enviado em</th>
                  <th className="text-center px-4 py-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((invite) => {
                  const cooldown = getResendCooldown(invite.last_sent_at);
                  const isResending = resendingId === invite.id;
                  const canResend = invite.status === 'pendente' && cooldown === 0;
                  
                  return (
                    <tr key={invite.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-foreground text-xs">{invite.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {invite.organization_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(invite.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {getStatusIcon(invite.status || 'pendente')}
                          <span className="text-xs capitalize">{invite.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {invite.status === 'pendente' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resendInvite(invite)}
                                disabled={!canResend || isResending}
                                className="text-xs"
                              >
                                {isResending ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                )}
                                {cooldown > 0 ? `${cooldown} min` : 'Reenviar'}
                              </Button>
                            </TooltipTrigger>
                            {cooldown > 0 && (
                              <TooltipContent>
                                <p>Aguarde {cooldown} minuto(s) para reenviar</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {invitations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum convite enviado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TooltipProvider>
      </main>
    </div>
  );
}
