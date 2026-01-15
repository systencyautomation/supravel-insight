import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface ProfileHeroProps {
  fullName: string | null;
  email: string | null;
  role?: string;
  isMasterAdmin?: boolean;
}

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

const getInitials = (name: string | null) => {
  if (!name) return 'U';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export const ProfileHero = ({ fullName, email, role, isMasterAdmin }: ProfileHeroProps) => {
  return (
    <div className="flex flex-col items-center text-center py-8 px-4">
      <Avatar className="h-24 w-24 mb-4 border-4 border-primary/20">
        <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
          {getInitials(fullName)}
        </AvatarFallback>
      </Avatar>
      
      <h1 className="text-2xl font-bold text-foreground mb-1">
        {fullName || 'Usuário'}
      </h1>
      
      <p className="text-muted-foreground mb-3">
        {email}
      </p>
      
      {isMasterAdmin ? (
        <Badge variant="default" className="bg-primary text-primary-foreground">
          Master Admin
        </Badge>
      ) : role ? (
        <Badge variant="secondary">
          {getRoleLabel(role)}
        </Badge>
      ) : null}
    </div>
  );
};
