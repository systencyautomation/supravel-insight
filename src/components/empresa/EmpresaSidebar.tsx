import { cn } from '@/lib/utils';
import { LayoutDashboard, ListFilter, Users, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';

export type EmpresaView = 'overview' | 'vendas' | 'equipe' | 'gerentes' | 'vendedores' | 'representantes';

interface EmpresaSidebarProps {
  activeView: EmpresaView;
  onViewChange: (view: EmpresaView) => void;
}

interface MenuItem {
  id: EmpresaView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { id: EmpresaView; label: string }[];
}

const menuItems: MenuItem[] = [
  { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'vendas', label: 'Vendas', icon: ListFilter },
  { 
    id: 'equipe', 
    label: 'Equipe', 
    icon: Users,
    children: [
      { id: 'gerentes', label: 'Gerentes' },
      { id: 'vendedores', label: 'Vendedores Internos' },
      { id: 'representantes', label: 'Representantes' },
    ]
  },
];

export function EmpresaSidebar({ activeView, onViewChange }: EmpresaSidebarProps) {
  const [equipeOpen, setEquipeOpen] = useState(
    ['equipe', 'gerentes', 'vendedores', 'representantes'].includes(activeView)
  );

  const isActive = (id: EmpresaView) => activeView === id;
  const isEquipeActive = ['equipe', 'gerentes', 'vendedores', 'representantes'].includes(activeView);

  return (
    <aside className="w-48 shrink-0 border-r border-border/50 bg-muted/20">
      <nav className="p-3 space-y-1">
        {menuItems.map((item) => {
          if (item.children) {
            return (
              <Collapsible
                key={item.id}
                open={equipeOpen}
                onOpenChange={setEquipeOpen}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'w-full justify-start gap-2 font-normal',
                      isEquipeActive && 'bg-accent text-accent-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronRight className={cn(
                      'h-4 w-4 transition-transform',
                      equipeOpen && 'rotate-90'
                    )} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-6 pt-1 space-y-1">
                  {item.children.map((child) => (
                    <Button
                      key={child.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewChange(child.id)}
                      className={cn(
                        'w-full justify-start font-normal text-sm',
                        isActive(child.id) && 'bg-primary/10 text-primary font-medium'
                      )}
                    >
                      {child.label}
                    </Button>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          }

          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              onClick={() => onViewChange(item.id)}
              className={cn(
                'w-full justify-start gap-2 font-normal',
                isActive(item.id) && 'bg-primary/10 text-primary font-medium'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}
