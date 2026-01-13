import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';

export function DashboardHeader() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">S</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">SUPRAVEL</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Sistema de Comissões</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={toggleTheme} className="w-9 h-9 p-0">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}
