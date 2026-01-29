import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SettingsLayout } from '@/layouts/SettingsLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, User } from 'lucide-react';
import { ProfileHero } from '@/components/profile/ProfileHero';
import { ChangePasswordCard } from '@/components/profile/ChangePasswordCard';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

export default function ProfileSettings() {
  const { user, userRoles, effectiveOrgId, isMasterAdmin } = useAuth();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const userRole = userRoles.find(r => r.organization_id === effectiveOrgId)?.role;

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
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
    } catch (error) {
      console.error('Error fetching profile:', error);
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

  return (
    <SettingsLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Hero Section */}
        <ProfileHero
          fullName={fullName || profile?.full_name}
          email={user?.email}
          role={userRole}
          isMasterAdmin={isMasterAdmin}
        />

        {/* Profile Card */}
        <Card className="hover-lift">
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
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
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
                      value={user?.email || ''}
                      disabled
                      className="h-11 rounded-xl bg-muted/50"
                    />
                  </div>
                </div>
                <Button onClick={handleSaveProfile} disabled={saving} className="gap-2 rounded-xl">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar alterações
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <ChangePasswordCard />
      </div>
    </SettingsLayout>
  );
}
