import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, User, Building2, Eye, Menu } from 'lucide-react';
import { TeamMembersList } from '@/components/TeamMembersList';
import { InviteMemberDialog } from '@/components/InviteMemberDialog';
import { ProfileHero } from '@/components/profile/ProfileHero';
import { ProfileSidebar } from '@/components/profile/ProfileSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

const Profile = () => {
  const { 
    user, 
    loading: authLoading, 
    userRoles, 
    effectiveOrgId,
    impersonatedOrgName,
    isMasterAdmin
  } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('profile-section');

  const userRole = userRoles.find(r => r.organization_id === effectiveOrgId)?.role;
  const canInvite = isMasterAdmin || userRole === 'admin' || userRole === 'manager';

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      fetchData();
    }
  }, [user, authLoading, navigate, effectiveOrgId]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      
      if (profileData) {
        setProfile(profileData);
        setFullName(profileData.full_name || '');
      }

      if (effectiveOrgId) {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, name, slug')
          .eq('id', effectiveOrgId)
          .maybeSingle();

        if (orgError) throw orgError;
        if (orgData) {
          setOrganization(orgData);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados do perfil.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o perfil.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <SidebarProvider>
        <div className="flex min-h-[calc(100vh-64px)] w-full">
          {/* Sidebar - hidden on mobile */}
          <div className="hidden lg:block">
            <ProfileSidebar
              showTeamSection={Boolean(organization && canInvite)}
              activeSection={activeSection}
              onSectionClick={handleSectionClick}
            />
          </div>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {/* Mobile sidebar trigger */}
            <div className="lg:hidden p-4 border-b border-border">
              <SidebarTrigger>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Menu className="h-4 w-4" />
                  Menu
                </Button>
              </SidebarTrigger>
            </div>

            <div className="container max-w-4xl mx-auto px-4 sm:px-6 py-6">
              {/* Hero Section */}
              <Card className="mb-8">
                <ProfileHero
                  fullName={fullName || profile?.full_name}
                  email={user.email}
                  role={userRole}
                  isMasterAdmin={isMasterAdmin}
                />
              </Card>

              {/* Profile Section */}
              <Card id="profile-section" className="mb-8 scroll-mt-24">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Informações Pessoais</CardTitle>
                      <CardDescription>Gerencie suas informações de conta</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Nome completo</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Seu nome completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={user.email || ''}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar alterações
                  </Button>
                </CardContent>
              </Card>

              {/* Organization Section */}
              {organization && (
                <Card id="org-section" className="mb-8 scroll-mt-24">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Minha Organização</CardTitle>
                        <CardDescription>Informações da sua empresa</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {impersonatedOrgName && (
                      <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-md">
                        <Eye className="h-4 w-4 text-warning" />
                        <span className="text-sm text-warning">
                          Visualizando como: {impersonatedOrgName}
                        </span>
                      </div>
                    )}
                    
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Nome da empresa</Label>
                        <Input value={organization.name} disabled className="bg-muted" />
                      </div>
                      <div className="space-y-2">
                        <Label>Identificador</Label>
                        <Input value={organization.slug} disabled className="bg-muted" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Team Section - Only for admins/managers */}
              {organization && canInvite && (
                <Card id="team-section" className="scroll-mt-24">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle>Equipe da Organização</CardTitle>
                          <CardDescription>Gerencie os membros da sua equipe</CardDescription>
                        </div>
                      </div>
                      <InviteMemberDialog 
                        organizationId={organization.id} 
                        organizationName={organization.name}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <TeamMembersList 
                      organizationId={organization.id} 
                      organizationName={organization.name}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default Profile;
