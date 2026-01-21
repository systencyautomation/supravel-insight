import { Building2, Eye, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Organization {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  created_at: string;
}

interface OrganizationsCardProps {
  organizations: Organization[];
  onToggleActive: (org: Organization) => void;
  onImpersonate: (org: Organization) => void;
  onOpenDialog: () => void;
}

export function OrganizationsCard({
  organizations,
  onToggleActive,
  onImpersonate,
  onOpenDialog,
}: OrganizationsCardProps) {
  return (
    <Card className="overflow-hidden animate-fade-in" style={{ animationDelay: '100ms' }}>
      <CardHeader className="flex flex-row items-center justify-between pb-3 bg-muted/20">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            Organizações
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {organizations.length} registrada{organizations.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button size="sm" onClick={onOpenDialog}>
          <Plus className="h-3 w-3 mr-1" />
          Nova
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {organizations.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-1">
              Nenhuma organização
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Comece criando sua primeira organização
            </p>
            <Button size="sm" onClick={onOpenDialog}>
              <Plus className="h-3 w-3 mr-1" />
              Criar Organização
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/30">
                <TableHead className="text-xs">Empresa</TableHead>
                <TableHead className="text-xs">Slug</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Criada</TableHead>
                <TableHead className="text-xs text-center">Status</TableHead>
                <TableHead className="text-xs text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.id} className="group">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate max-w-[120px]">{org.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {org.slug}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                    {new Date(org.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      {org.active ? (
                        <Badge variant="default" className="bg-success/10 text-success border-success/20 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5 animate-pulse" />
                          Ativa
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground text-xs">
                          Inativa
                        </Badge>
                      )}
                      <Switch
                        checked={org.active}
                        onCheckedChange={() => onToggleActive(org)}
                        className="scale-75"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onImpersonate(org)}
                      className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Visualizar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
