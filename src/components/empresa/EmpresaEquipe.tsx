import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCog, Briefcase, Building2 } from 'lucide-react';
import { EmpresaView } from './EmpresaSidebar';

interface EmpresaEquipeProps {
  view: EmpresaView;
}

const viewConfig: Record<string, { title: string; description: string; icon: React.ComponentType<{ className?: string }> }> = {
  gerentes: {
    title: 'Gerentes',
    description: 'Gerencie os gerentes e suas permissões',
    icon: UserCog,
  },
  vendedores: {
    title: 'Vendedores Internos',
    description: 'Gerencie os vendedores internos e suas comissões',
    icon: Briefcase,
  },
  representantes: {
    title: 'Representantes',
    description: 'Gerencie os representantes e suas regiões',
    icon: Building2,
  },
};

export function EmpresaEquipe({ view }: EmpresaEquipeProps) {
  const config = viewConfig[view] || {
    title: 'Equipe',
    description: 'Selecione uma categoria de equipe',
    icon: Users,
  };

  const Icon = config.icon;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {config.title}
        </h2>
        <p className="text-sm text-muted-foreground">{config.description}</p>
      </div>

      <Card className="bg-muted/30 border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Em Desenvolvimento</CardTitle>
          <CardDescription>
            A funcionalidade de gerenciamento de {config.title.toLowerCase()} será implementada em breve.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Icon className="h-16 w-16 opacity-20" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
