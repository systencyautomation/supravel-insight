import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SettingsLayout } from '@/layouts/SettingsLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, Eye } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export default function OrganizationSettings() {
  const { user, effectiveOrgId, impersonatedOrgName } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!effectiveOrgId) {
      navigate('/settings/profile');
      return;
    }

    if (user) {
      fetchOrganization();
    }
  }, [user, effectiveOrgId, navigate]);

  const fetchOrganization = async () => {
    if (!effectiveOrgId) return;

    try {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('id', effectiveOrgId)
        .maybeSingle();

      if (orgError) throw orgError;
      if (orgData) {
        setOrganization(orgData);
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados da organização.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsLayout>
      <div className="max-w-2xl mx-auto">
        <Card className="hover-lift">
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
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : organization ? (
              <>
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
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma organização encontrada.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
}
