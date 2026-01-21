import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Clock, Trash2, Users, RefreshCw, Copy, Pencil, UserMinus } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { EditRoleDialog } from '@/components/team/EditRoleDialog';

interface TeamMembersListProps {
  organizationId: string;
  organizationName: string;
}

interface MemberInvitation {
  id: string;
  email: string;
  guest_name: string | null;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
  last_sent_at: string;
  token: string;
}

interface TeamMember {
  user_id: string;
  role: string;
  profile: {
    full_name: string | null;
    email: string | null;
  } | null;
}

export function TeamMembersList({ organizationId, organizationName }: TeamMembersListProps) {
  const { toast } = useToast();
  const { user, userRoles, effectiveOrgId, isMasterAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<MemberInvitation[]>([]);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const currentUserRole = userRoles.find(r => r.organization_id === effectiveOrgId)?.role;
  const { hasPermission } = usePermissions();
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  
  // Check if current user can edit a member's role
  const canEditRole = (member: TeamMember): boolean => {
    // Master admin can edit anyone except other admins
    if (isMasterAdmin) return member.role !== 'admin' && member.role !== 'super_admin';
    
    // Can't edit your own role
    if (member.user_id === user?.id) return false;
    
    // Can't edit admins
    if (member.role === 'admin' || member.role === 'super_admin') return false;
    
    // Admin can edit manager, seller, representative
    if (currentUserRole === 'admin') return true;
    
    // Manager can only edit seller and representative
    if (currentUserRole === 'manager') {
      return member.role === 'seller' || member.role === 'representative';
    }
    
    return false;
  };

  // Check if current user can remove a member
  const canRemoveMember = (member: TeamMember): boolean => {
    // Can't remove yourself
    if (member.user_id === user?.id) return false;
    
    // Can't remove admins or super_admins
    if (member.role === 'admin' || member.role === 'super_admin') return false;
    
    // Must have remove_members permission
    return hasPermission('remove_members');
  };

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
        .select('id, email, guest_name, role, status, created_at, expires_at, last_sent_at, token')
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

  const getResendCooldown = (lastSentAt: string): number => {
    const lastSent = new Date(lastSentAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSent.getTime()) / (1000 * 60);
    return Math.max(0, Math.ceil(3 - diffMinutes));
  };

  const handleResendInvitation = async (invitation: MemberInvitation) => {
    const cooldown = getResendCooldown(invitation.last_sent_at);
    if (cooldown > 0) {
      toast({
        title: 'Aguarde',
        description: `Você pode reenviar o convite em ${cooldown} minuto(s).`,
        variant: 'destructive',
      });
      return;
    }

    setResendingId(invitation.id);
    try {
      // Fetch current user's name
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      const inviterName = profileData?.full_name || user.email || 'Administrador';

      // Generate invite link
      const inviteLink = `${window.location.origin}/join?token=${invitation.token}`;

      // Call edge function to resend email
      const { error: sendError } = await supabase.functions.invoke('send-member-invitation', {
        body: {
          email: invitation.email,
          guestName: invitation.guest_name,
          organizationName,
          inviterName,
          inviteLink,
          role: invitation.role,
        },
      });

      if (sendError) throw sendError;

      // Update last_sent_at in database
      const { error: updateError } = await supabase
        .from('member_invitations')
        .update({ last_sent_at: new Date().toISOString() })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      // Update local state
      setInvitations(prev =>
        prev.map(i =>
          i.id === invitation.id
            ? { ...i, last_sent_at: new Date().toISOString() }
            : i
        )
      );

      toast({
        title: 'Convite reenviado',
        description: `Email enviado novamente para ${invitation.email}.`,
      });
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível reenviar o convite.',
        variant: 'destructive',
      });
    } finally {
      setResendingId(null);
    }
  };

  const handleCopyInviteLink = async (invitation: MemberInvitation) => {
    const inviteLink = `${window.location.origin}/join?token=${invitation.token}`;
    
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast({
        title: 'Link copiado!',
        description: 'Cole o link no WhatsApp ou onde preferir.',
      });
    } catch (error) {
      // Fallback para navegadores mais antigos
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      toast({
        title: 'Link copiado!',
        description: 'Cole o link no WhatsApp ou onde preferir.',
      });
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

  const handleRemoveMember = async (member: TeamMember) => {
    setRemovingMemberId(member.user_id);
    
    try {
      // Remove user_roles entry (doesn't delete the auth user)
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', member.user_id)
        .eq('organization_id', organizationId);

      if (error) throw error;

      setMembers(prev => prev.filter(m => m.user_id !== member.user_id));
      toast({
        title: 'Membro removido',
        description: `${member.profile?.full_name || member.profile?.email} foi removido da organização.`,
      });
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o membro.',
        variant: 'destructive',
      });
    } finally {
      setRemovingMemberId(null);
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
    <TooltipProvider>
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
                    <div className="flex items-center gap-2">
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {getRoleLabel(member.role)}
                      </Badge>
                      {canEditRole(member) && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                onClick={() => setEditingMember(member)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Alterar cargo</TooltipContent>
                          </Tooltip>
                        </>
                      )}
                      {canRemoveMember(member) && (
                        <AlertDialog>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  disabled={removingMemberId === member.user_id}
                                >
                                  {removingMemberId === member.user_id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <UserMinus className="h-4 w-4" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent>Remover membro</TooltipContent>
                          </Tooltip>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover membro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover{' '}
                                <strong>{member.profile?.full_name || member.profile?.email}</strong> da organização?
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveMember(member)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
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
              {invitations.map((invitation) => {
                const cooldown = getResendCooldown(invitation.last_sent_at);
                const isResending = resendingId === invitation.id;
                const canResend = cooldown === 0 && !isResending;

                return (
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
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => handleCopyInviteLink(invitation)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copiar link do convite</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => handleResendInvitation(invitation)}
                              disabled={!canResend}
                            >
                              {isResending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {cooldown > 0
                              ? `Aguarde ${cooldown} min para reenviar`
                              : 'Reenviar convite'}
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleCancelInvitation(invitation.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Cancelar convite</TooltipContent>
                        </Tooltip>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Edit Role Dialog */}
        <EditRoleDialog
          member={editingMember}
          organizationId={organizationId}
          currentUserRole={currentUserRole}
          onClose={() => setEditingMember(null)}
          onSuccess={fetchData}
        />

      </div>
    </TooltipProvider>
  );
}
