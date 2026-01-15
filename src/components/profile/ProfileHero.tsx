import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-background to-muted/30 p-8">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
      
      <div className="relative flex flex-col items-center text-center">
        {/* Avatar with gradient ring */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-primary/50 blur-md opacity-50" />
          <Avatar className="relative h-28 w-28 border-4 border-background shadow-xl">
            <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
              {getInitials(fullName)}
            </AvatarFallback>
          </Avatar>
          
          {/* Online indicator */}
          <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-success border-2 border-background" />
        </div>
        
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-bold text-foreground">
            {fullName || 'Usuário'}
          </h1>
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        
        <p className="text-muted-foreground mb-4">
          {email}
        </p>
        
        {isMasterAdmin ? (
          <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0 shadow-md shadow-primary/20 px-4 py-1">
            <Sparkles className="h-3 w-3 mr-1" />
            Master Admin
          </Badge>
        ) : role ? (
          <Badge variant="secondary" className="px-4 py-1 font-medium">
            {getRoleLabel(role)}
          </Badge>
        ) : null}
      </div>
    </div>
  );
};
