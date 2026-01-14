import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Save, User, Building2, Shield } from 'lucide-react';
import { TeamMembersList } from '@/components/TeamMembersList';
import { InviteMemberDialog } from '@/components/InviteMemberDialog';

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
  const { user, loading: authLoading, userRoles, organizationId } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const userRole = userRoles.find(r => r.organization_id === organizationId)?.role;
  const canInvite = userRole === 'admin' || userRole === 'manager';

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      fetchData();
    }
  }, [user, authLoading, navigate]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch profile
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

      // Fetch organization if user has one
      if (organizationId) {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, name, slug')
          .eq('id', organizationId)
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

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: 'Super Administrador',
      admin: 'Administrador',
      manager: 'Gerente',
      seller: 'Vendedor',
      representative: 'Representante',
    };
    return labels[role] || role;
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
      
      <div className="container mx-auto px-6 py-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/')}
          className="gap-2 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Dashboard
        </Button>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Meu Perfil</CardTitle>
                  <CardDescription>Gerencie suas informações pessoais</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
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

          {/* Organization Card */}
          {organization && (
            <Card>
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
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nome da empresa</Label>
                    <Input value={organization.name} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>Identificador</Label>
                    <Input value={organization.slug} disabled className="bg-muted" />
                  </div>
                </div>
                
                {userRole && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Seu cargo:</span>
                    <span className="text-sm font-medium">{getRoleLabel(userRole)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Team Section - Only for admins/managers */}
          {organization && canInvite && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Equipe da Organização</h2>
                    <p className="text-sm text-muted-foreground">
                      Gerencie os membros da sua equipe
                    </p>
                  </div>
                  <InviteMemberDialog 
                    organizationId={organization.id} 
                    organizationName={organization.name}
                  />
                </div>
                <TeamMembersList organizationId={organization.id} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
