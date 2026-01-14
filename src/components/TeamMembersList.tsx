import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Clock, CheckCircle, XCircle, Trash2, Users } from 'lucide-react';

interface TeamMembersListProps {
  organizationId: string;
}

interface MemberInvitation {
  id: string;
  email: string;
  guest_name: string | null;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
}

interface TeamMember {
  user_id: string;
  role: string;
  profile: {
    full_name: string | null;
    email: string | null;
  } | null;
}

export function TeamMembersList({ organizationId }: TeamMembersListProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<MemberInvitation[]>([]);

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  const fetchData = async () => {
    try {
      // Fetch team members
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('organization_id', organizationId);

      if (rolesError) throw rolesError;

      // Fetch profiles for each member
      const membersWithProfiles: TeamMember[] = [];
      for (const roleData of rolesData || []) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', roleData.user_id)
          .maybeSingle();

        membersWithProfiles.push({
          user_id: roleData.user_id,
          role: roleData.role,
          profile: profileData,
        });
      }
      setMembers(membersWithProfiles);

      // Fetch pending invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('member_invitations')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });

      if (invitationsError) throw invitationsError;
      setInvitations(invitationsData || []);
    } catch (error) {
      console.error('Error fetching team data:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados da equipe.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('member_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      setInvitations(prev => prev.filter(i => i.id !== invitationId));
      toast({
        title: 'Convite cancelado',
        description: 'O convite foi removido com sucesso.',
      });
    } catch (error) {
      console.error('Error canceling invitation:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível cancelar o convite.',
        variant: 'destructive',
      });
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: 'Super Admin',
      admin: 'Administrador',
      manager: 'Gerente',
      seller: 'Vendedor',
      representative: 'Representante',
    };
    return labels[role] || role;
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
      case 'super_admin':
        return 'default';
      case 'manager':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Members */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Users className="h-4 w-4" />
          Membros Ativos ({members.length})
        </h3>
        {members.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground">
              Nenhum membro encontrado.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {members.map((member) => (
              <Card key={member.user_id}>
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-primary">
                        {(member.profile?.full_name || member.profile?.email || '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {member.profile?.full_name || 'Sem nome'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.profile?.email}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getRoleBadgeVariant(member.role)}>
                    {getRoleLabel(member.role)}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Convites Pendentes ({invitations.length})
          </h3>
          <div className="grid gap-3">
            {invitations.map((invitation) => (
              <Card key={invitation.id} className="border-dashed">
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {invitation.guest_name || invitation.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {invitation.guest_name && invitation.email}
                        {!invitation.guest_name && 'Aguardando aceite'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{getRoleLabel(invitation.role)}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleCancelInvitation(invitation.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
