import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Building2, Users, Plug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const menuItems = [
  { path: '/settings/profile', label: 'Meu Perfil', icon: User },
  { path: '/settings/organization', label: 'Empresa', icon: Building2 },
  { path: '/settings/team', label: 'Equipe', icon: Users },
  { path: '/settings/integrations', label: 'Integrações', icon: Plug },
];

export function SettingsSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRoles, effectiveOrgId, isMasterAdmin } = useAuth();

  const userRole = userRoles.find(r => r.organization_id === effectiveOrgId)?.role;
  const canAccessTeam = isMasterAdmin || userRole === 'admin' || userRole === 'manager';
  const hasOrganization = !!effectiveOrgId;

  const filteredItems = menuItems.filter(item => {
    if (item.path === '/settings/team') return canAccessTeam && hasOrganization;
    if (item.path === '/settings/organization') return hasOrganization;
    if (item.path === '/settings/integrations') return canAccessTeam && hasOrganization;
    return true;
  });

  return (
    <aside className="w-64 border-r border-border/40 min-h-[calc(100vh-4rem)] bg-muted/30 p-4 flex flex-col">
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => navigate('/')}
        className="justify-start gap-2 mb-6 hover:bg-accent/80"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      <nav className="space-y-1 flex-1">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/80"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
