import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SettingsLayout } from '@/layouts/SettingsLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Shield } from 'lucide-react';
import { TeamMembersList } from '@/components/TeamMembersList';
import { InviteMemberDialog } from '@/components/InviteMemberDialog';
import { RolePermissionsManager } from '@/components/team/RolePermissionsManager';

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export default function TeamSettings() {
  const { user, userRoles, effectiveOrgId, isMasterAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const userRole = userRoles.find(r => r.organization_id === effectiveOrgId)?.role;
  const canInvite = isMasterAdmin || userRole === 'admin' || userRole === 'manager';
  const canManagePermissions = isMasterAdmin || userRole === 'admin';

  useEffect(() => {
    if (!effectiveOrgId || !canInvite) {
      navigate('/settings/profile');
      return;
    }

    if (user) {
      fetchOrganization();
    }
  }, [user, effectiveOrgId, canInvite, navigate]);

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
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Team Members Section */}
        <Card className="hover-lift">
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
              {organization && (
                <InviteMemberDialog 
                  organizationId={organization.id} 
                  organizationName={organization.name}
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : organization ? (
              <TeamMembersList 
                organizationId={organization.id} 
                organizationName={organization.name}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma organização encontrada.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role Permissions Section - Only for Admins */}
        {canManagePermissions && organization && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium text-muted-foreground">Configurações de Cargos</h2>
            </div>
            <RolePermissionsManager organizationId={organization.id} />
          </div>
        )}
      </div>
    </SettingsLayout>
  );
}
