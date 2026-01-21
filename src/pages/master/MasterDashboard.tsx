import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Send, Mail } from 'lucide-react';
import { z } from 'zod';

import { MasterDashboardSkeleton } from '@/components/master/MasterDashboardSkeleton';
import { MasterHeader } from '@/components/master/MasterHeader';
import { MasterKPICards } from '@/components/master/MasterKPICards';
import { OrganizationsCard } from '@/components/master/OrganizationsCard';
import { InvitationsCard } from '@/components/master/InvitationsCard';
import { SaasAdminSection } from '@/components/master/SaasAdminSection';

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
  const { user, loading, isMasterAdmin, isSaasAdmin, impersonatedOrgName, setImpersonatedOrg, signOut } = useAuth();
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (!loading && user && !isMasterAdmin && !isSaasAdmin) {
      navigate('/');
      return;
    }

    if (user && (isMasterAdmin || isSaasAdmin)) {
      fetchData();
    }
  }, [user, loading, isMasterAdmin, isSaasAdmin, navigate]);

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
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: newOrgName, slug: newOrgSlug })
        .select()
        .single();

      if (orgError) throw orgError;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: adminName }
        }
      });

      if (authError) throw authError;

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

      const inviteLink = `${window.location.origin}/onboarding?token=${invite.token}`;

      try {
        const { error: emailError } = await supabase.functions.invoke('send-invitation', {
          body: { email: inviteEmail, inviteLink, organizationName: inviteOrgName }
        });

        if (emailError) {
          console.warn('Email sending failed:', emailError);
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

  const deleteInvite = async (invite: Invitation) => {
    setDeletingId(invite.id);
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invite.id);

      if (error) throw error;

      toast({
        title: 'Convite removido',
        description: `O convite para ${invite.email} foi removido.`,
      });

      fetchInvitations();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading || loadingData) {
    return <MasterDashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      <MasterHeader
        userEmail={user?.email}
        isMasterAdmin={isMasterAdmin}
        impersonatedOrgName={impersonatedOrgName}
        onExitImpersonation={exitImpersonation}
        onSignOut={signOut}
      />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="animate-fade-in">
          <MasterKPICards 
            organizations={organizations} 
            invitations={invitations} 
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <OrganizationsCard
            organizations={organizations}
            onToggleActive={toggleActive}
            onImpersonate={handleImpersonate}
            onOpenDialog={() => {
              setCreateTab('manual');
              setDialogOpen(true);
            }}
          />

          <InvitationsCard
            invitations={invitations}
            resendingId={resendingId}
            deletingId={deletingId}
            onResend={resendInvite}
            onDelete={deleteInvite}
            onOpenDialog={() => {
              setCreateTab('invite');
              setDialogOpen(true);
            }}
            getResendCooldown={getResendCooldown}
          />
        </div>

        {/* SaaS Admin Section - Only visible to Master Admin */}
        {isMasterAdmin && <SaasAdminSection />}
      </main>

      {/* Create/Invite Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md border-border/50">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {createTab === 'manual' ? 'Nova Organização' : 'Enviar Convite'}
            </DialogTitle>
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

              <div className="border-t border-border/50 pt-4">
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

              <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
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
  );
}
