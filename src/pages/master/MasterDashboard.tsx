import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Send, Mail, LayoutDashboard, Building2, MailOpen } from 'lucide-react';
import { z } from 'zod';

import { MasterDashboardSkeleton } from '@/components/master/MasterDashboardSkeleton';
import { MasterHeader } from '@/components/master/MasterHeader';
import { MasterKPICards } from '@/components/master/MasterKPICards';
import { OrganizationsCard } from '@/components/master/OrganizationsCard';
import { InvitationsCard } from '@/components/master/InvitationsCard';
import { SaasAdminSection } from '@/components/master/SaasAdminSection';
import { OrganizationsList } from '@/components/master/OrganizationsList';
import { InvitationsList } from '@/components/master/InvitationsList';

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

interface OrganizationMember {
  id: string;
  user_id: string;
  role: string;
  organization_id: string;
  email?: string;
  full_name?: string;
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
  const [members, setMembers] = useState<Record<string, OrganizationMember[]>>({});
  const [loadingData, setLoadingData] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createTab, setCreateTab] = useState<'manual' | 'invite'>('manual');
  const [activeTab, setActiveTab] = useState('dashboard');

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

  // Deactivation confirmation state
  const [deactivateConfirmOrg, setDeactivateConfirmOrg] = useState<Organization | null>(null);
  const [deactivateConfirmText, setDeactivateConfirmText] = useState('');

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
    await Promise.all([fetchOrganizations(), fetchInvitations(), fetchMembers()]);
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

  const fetchMembers = async () => {
    // Fetch all user_roles with profile info
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('id, user_id, role, organization_id');

    if (rolesError || !roles) return;

    // Fetch profiles for these users
    const userIds = [...new Set(roles.map(r => r.user_id))];
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    if (profilesError) return;

    // Create a map of user_id to profile
    const profileMap = new Map(profiles?.map(p => [p.id, p]));

    // Group members by organization
    const membersByOrg: Record<string, OrganizationMember[]> = {};
    roles.forEach(role => {
      if (!role.organization_id) return;
      const profile = profileMap.get(role.user_id);
      const member: OrganizationMember = {
        id: role.id,
        user_id: role.user_id,
        role: role.role,
        organization_id: role.organization_id,
        email: profile?.email,
        full_name: profile?.full_name,
      };
      if (!membersByOrg[role.organization_id]) {
        membersByOrg[role.organization_id] = [];
      }
      membersByOrg[role.organization_id].push(member);
    });

    setMembers(membersByOrg);
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

  const handleToggleActive = (org: Organization) => {
    if (org.active) {
      // If currently active, we're deactivating - require confirmation
      setDeactivateConfirmOrg(org);
      setDeactivateConfirmText('');
    } else {
      // If currently inactive, we're activating - do it immediately
      executeToggleActive(org);
    }
  };

  const executeToggleActive = async (org: Organization) => {
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
      toast({
        title: org.active ? 'Organização Desativada' : 'Organização Ativada',
        description: `${org.name} foi ${org.active ? 'desativada' : 'ativada'} com sucesso.`,
      });
    }
  };

  const confirmDeactivate = async () => {
    if (deactivateConfirmText !== 'DESATIVAR' || !deactivateConfirmOrg) return;
    await executeToggleActive(deactivateConfirmOrg);
    setDeactivateConfirmOrg(null);
    setDeactivateConfirmText('');
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
      fetchMembers();
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

  const openOrgDialog = () => {
    setCreateTab('manual');
    setDialogOpen(true);
  };

  const openInviteDialog = () => {
    setCreateTab('invite');
    setDialogOpen(true);
  };

  if (loading || loadingData) {
    return <MasterDashboardSkeleton />;
  }

  const pendingInvitationsCount = invitations.filter(i => i.status === 'pendente').length;

  return (
    <div className="min-h-screen bg-background">
      <MasterHeader
        userEmail={user?.email}
        isMasterAdmin={isMasterAdmin}
        impersonatedOrgName={impersonatedOrgName}
        onExitImpersonation={exitImpersonation}
        onSignOut={signOut}
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Main Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full justify-start border-b border-border/50 bg-transparent p-0 h-auto">
            <TabsTrigger 
              value="dashboard" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
            >
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="organizations" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Organizações
              <span className="ml-2 bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded-full">
                {organizations.length}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="invitations" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
            >
              <MailOpen className="h-4 w-4 mr-2" />
              Convites
              {pendingInvitationsCount > 0 && (
                <span className="ml-2 bg-warning/20 text-warning text-xs px-1.5 py-0.5 rounded-full">
                  {pendingInvitationsCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6 animate-fade-in">
            <MasterKPICards 
              organizations={organizations} 
              invitations={invitations} 
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <OrganizationsCard
                organizations={organizations}
                onToggleActive={handleToggleActive}
                onImpersonate={handleImpersonate}
                onOpenDialog={openOrgDialog}
              />

              <InvitationsCard
                invitations={invitations}
                resendingId={resendingId}
                deletingId={deletingId}
                onResend={resendInvite}
                onDelete={deleteInvite}
                onOpenDialog={openInviteDialog}
                getResendCooldown={getResendCooldown}
              />
            </div>

            {isMasterAdmin && <SaasAdminSection />}
          </TabsContent>

          {/* Organizations Tab */}
          <TabsContent value="organizations" className="animate-fade-in">
            <OrganizationsList
              organizations={organizations}
              members={members}
              onToggleActive={handleToggleActive}
              onImpersonate={handleImpersonate}
              onOpenDialog={openOrgDialog}
            />
          </TabsContent>

          {/* Invitations Tab */}
          <TabsContent value="invitations" className="animate-fade-in">
            <InvitationsList
              invitations={invitations}
              resendingId={resendingId}
              deletingId={deletingId}
              onResend={resendInvite}
              onDelete={deleteInvite}
              onOpenDialog={openInviteDialog}
              getResendCooldown={getResendCooldown}
            />
          </TabsContent>
        </Tabs>
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

      {/* Deactivation Confirmation Dialog */}
      <AlertDialog 
        open={!!deactivateConfirmOrg} 
        onOpenChange={(open) => {
          if (!open) {
            setDeactivateConfirmOrg(null);
            setDeactivateConfirmText('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Desativar Organização
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Você está prestes a desativar a organização{' '}
                  <strong className="text-foreground">{deactivateConfirmOrg?.name}</strong>.
                </p>
                <p className="text-sm text-muted-foreground">
                  Usuários desta organização perderão acesso ao sistema enquanto ela estiver desativada.
                </p>
                <div className="pt-2">
                  <Label htmlFor="confirm-deactivate" className="text-foreground">
                    Digite <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-destructive">DESATIVAR</code> para confirmar:
                  </Label>
                  <Input
                    id="confirm-deactivate"
                    value={deactivateConfirmText}
                    onChange={(e) => setDeactivateConfirmText(e.target.value.toUpperCase())}
                    placeholder="DESATIVAR"
                    className="mt-2"
                    autoComplete="off"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeactivateConfirmText('')}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeactivate}
              disabled={deactivateConfirmText !== 'DESATIVAR'}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Desativar Organização
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <footer className="border-t border-border py-3 mt-auto">
        <div className="container mx-auto px-6 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Connect Dash © 2026 — Sistema de Gestão de Comissões
          </p>
        </div>
      </footer>
    </div>
  );
}
