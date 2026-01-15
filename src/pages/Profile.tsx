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
import { Loader2, Save, User, Building2, Eye, Users } from 'lucide-react';
import { TeamMembersList } from '@/components/TeamMembersList';
import { InviteMemberDialog } from '@/components/InviteMemberDialog';
import { ProfileHero } from '@/components/profile/ProfileHero';

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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20 animate-pulse">
            <span className="text-primary-foreground font-bold text-xl">S</span>
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <DashboardHeader />
      
      <main className="container max-w-4xl mx-auto px-4 sm:px-6 py-8 stagger-children">
        {/* Hero Section */}
        <div className="mb-8">
          <ProfileHero
            fullName={fullName || profile?.full_name}
            email={user.email}
            role={userRole}
            isMasterAdmin={isMasterAdmin}
          />
        </div>

        {/* Profile Section */}
        <Card id="profile-section" className="mb-8 scroll-mt-24 hover-lift">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Informações Pessoais</CardTitle>
                <CardDescription>Gerencie suas informações de conta</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium">Nome completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  value={user.email || ''}
                  disabled
                  className="h-11 rounded-xl bg-muted/50"
                />
              </div>
            </div>
            <Button onClick={handleSaveProfile} disabled={saving} className="gap-2 rounded-xl">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar alterações
            </Button>
          </CardContent>
        </Card>

        {/* Organization Section */}
        {organization && (
          <Card id="org-section" className="mb-8 scroll-mt-24 hover-lift">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Minha Organização</CardTitle>
                  <CardDescription>Informações da sua empresa</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {impersonatedOrgName && (
                <div className="flex items-center gap-3 p-4 bg-warning/10 border border-warning/20 rounded-xl">
                  <Eye className="h-5 w-5 text-warning" />
                  <span className="text-sm font-medium text-warning">
                    Visualizando como: {impersonatedOrgName}
                  </span>
                </div>
              )}
              
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Nome da empresa</Label>
                  <Input value={organization.name} disabled className="h-11 rounded-xl bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Identificador</Label>
                  <Input value={organization.slug} disabled className="h-11 rounded-xl bg-muted/50" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Section - Only for admins/managers */}
        {organization && canInvite && (
          <Card id="team-section" className="scroll-mt-24 hover-lift">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Equipe da Organização</CardTitle>
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
      </main>
    </div>
  );
};

export default Profile;