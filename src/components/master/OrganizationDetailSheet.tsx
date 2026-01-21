import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Building2, Eye, Users, Calendar, Shield, Mail, User } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Organization {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  created_at: string;
}

interface OrganizationMember {
  id: string;
  user_id: string;
  role: string;
  email?: string;
  full_name?: string;
}

interface OrganizationDetailSheetProps {
  organization: Organization | null;
  members: OrganizationMember[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImpersonate: (org: Organization) => void;
  onToggleActive: (org: Organization) => void;
}

const getRoleBadge = (role: string) => {
  const configs: Record<string, { label: string; className: string }> = {
    admin: { label: 'Admin', className: 'bg-primary/10 text-primary border-primary/20' },
    manager: { label: 'Gerente', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    seller: { label: 'Vendedor', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    representative: { label: 'Representante', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  };
  const config = configs[role] || { label: role, className: 'bg-muted text-muted-foreground' };
  return (
    <Badge variant="outline" className={`text-xs ${config.className}`}>
      {config.label}
    </Badge>
  );
};

export function OrganizationDetailSheet({
  organization,
  members,
  open,
  onOpenChange,
  onImpersonate,
  onToggleActive,
}: OrganizationDetailSheetProps) {
  if (!organization) return null;

  const admins = members.filter(m => m.role === 'admin');
  const managers = members.filter(m => m.role === 'manager');
  const sellers = members.filter(m => m.role === 'seller');
  const representatives = members.filter(m => m.role === 'representative');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-xl">{organization.name}</SheetTitle>
              <SheetDescription>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{organization.slug}</code>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-xs">Membros</span>
              </div>
              <p className="text-2xl font-semibold">{members.length}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">Criado em</span>
              </div>
              <p className="text-sm font-medium">
                {format(new Date(organization.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Status da Organização</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={organization.active ? 'default' : 'secondary'}>
                {organization.active ? 'Ativo' : 'Inativo'}
              </Badge>
              <Switch
                checked={organization.active}
                onCheckedChange={() => onToggleActive(organization)}
              />
            </div>
          </div>

          <Separator />

          {/* Members List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Membros ({members.length})
              </h3>
            </div>

            <ScrollArea className="h-[280px] pr-4">
              <div className="space-y-3">
                {/* Admins */}
                {admins.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Administradores
                    </p>
                    {admins.map((member) => (
                      <MemberRow key={member.id} member={member} />
                    ))}
                  </div>
                )}

                {/* Managers */}
                {managers.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Gerentes
                    </p>
                    {managers.map((member) => (
                      <MemberRow key={member.id} member={member} />
                    ))}
                  </div>
                )}

                {/* Sellers */}
                {sellers.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Vendedores
                    </p>
                    {sellers.map((member) => (
                      <MemberRow key={member.id} member={member} />
                    ))}
                  </div>
                )}

                {/* Representatives */}
                {representatives.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Representantes
                    </p>
                    {representatives.map((member) => (
                      <MemberRow key={member.id} member={member} />
                    ))}
                  </div>
                )}

                {members.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum membro encontrado</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-3">
            <Button 
              className="flex-1" 
              onClick={() => {
                onImpersonate(organization);
                onOpenChange(false);
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              Visualizar como Organização
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MemberRow({ member }: { member: OrganizationMember }) {
  const initials = member.full_name
    ? member.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : member.email?.[0].toUpperCase() || '?';

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
      <Avatar className="h-9 w-9">
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {member.full_name || 'Nome não definido'}
        </p>
        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
          <Mail className="h-3 w-3" />
          {member.email || 'Email não disponível'}
        </p>
      </div>
      {getRoleBadge(member.role)}
    </div>
  );
}
