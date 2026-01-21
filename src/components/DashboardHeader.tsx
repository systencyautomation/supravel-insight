import { Moon, Sun, Sparkles, Settings, User, Building2, Users, LogOut, Plug, ListFilter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PendingSalesNotification } from '@/components/PendingSalesNotification';

export function DashboardHeader() {
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Modern Logo with gradient */}
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-bold text-lg">S</span>
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-success animate-pulse" />
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                SUPRAVEL
              </h1>
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              Sistema de Comissões
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <PendingSalesNotification />

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/vendas')} 
            className="rounded-xl hover:bg-accent/80 gap-2"
          >
            <ListFilter className="h-4 w-4" />
            <span className="hidden sm:inline">Vendas</span>
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleTheme} 
            className="rounded-xl hover:bg-accent/80"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5 text-warning" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-accent/80">
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem onClick={() => navigate('/settings/profile')} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings/organization')} className="cursor-pointer">
                <Building2 className="mr-2 h-4 w-4" />
                Empresa
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings/team')} className="cursor-pointer">
                <Users className="mr-2 h-4 w-4" />
                Equipe
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings/integrations')} className="cursor-pointer">
                <Plug className="mr-2 h-4 w-4" />
                Integrações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Gradient line accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </header>
  );
}
