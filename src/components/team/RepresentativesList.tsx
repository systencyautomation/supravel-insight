import { useState } from 'react';
import { Mail, Phone, MoreVertical, Trash2, UserCheck, UserX, Building2, MapPin, Pencil, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Representative, RepresentativePosition } from '@/hooks/useRepresentatives';
import { EditRepresentativeDialog } from './EditRepresentativeDialog';
import { CreateAccessDialog } from './CreateAccessDialog';
import { cn } from '@/lib/utils';

interface RepresentativesListProps {
  representatives: Representative[];
  organizationId: string;
  onUpdate: (id: string, data: Partial<{
    name: string;
    email: string;
    phone: string;
    sede: string;
    company: string;
    position: RepresentativePosition;
    active: boolean;
  }>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onRefetch: () => void;
}

export function RepresentativesList({ 
  representatives, 
  organizationId,
  onUpdate, 
  onDelete,
  onRefetch 
}: RepresentativesListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editRep, setEditRep] = useState<Representative | null>(null);
  const [accessRep, setAccessRep] = useState<Representative | null>(null);

  const handleToggleActive = async (rep: Representative) => {
    await onUpdate(rep.id, { active: !rep.active });
  };

  const handleDelete = async () => {
    if (deleteId) {
      await onDelete(deleteId);
      setDeleteId(null);
    }
  };

  if (representatives.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum representante cadastrado ainda.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {representatives.map((rep) => (
          <div
            key={rep.id}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border transition-colors",
              rep.active 
                ? "bg-card hover:bg-accent/50" 
                : "bg-muted/50 opacity-60"
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium truncate">{rep.name}</span>
                {rep.position && (
                  <Badge variant={rep.position === 'representante' ? 'default' : 'secondary'} className="text-xs capitalize">
                    {rep.position}
                  </Badge>
                )}
                {!rep.active && (
                  <Badge variant="outline" className="text-xs">Inativo</Badge>
                )}
                {rep.user_id && (
                  <Badge variant="outline" className="text-xs text-primary">Com acesso</Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                {rep.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {rep.email}
                  </span>
                )}
                {rep.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {rep.phone}
                  </span>
                )}
                {rep.company && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {rep.company}
                  </span>
                )}
                {rep.sede && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {rep.sede}
                  </span>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditRep(rep)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                {!rep.user_id && (
                  <DropdownMenuItem onClick={() => setAccessRep(rep)}>
                    <Key className="h-4 w-4 mr-2" />
                    Criar Acesso
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleToggleActive(rep)}>
                  {rep.active ? (
                    <>
                      <UserX className="h-4 w-4 mr-2" />
                      Desativar
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Ativar
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setDeleteId(rep.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir representante?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O representante será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditRepresentativeDialog
        representative={editRep}
        open={!!editRep}
        onOpenChange={(open) => !open && setEditRep(null)}
        onSave={onUpdate}
      />

      <CreateAccessDialog
        representative={accessRep}
        organizationId={organizationId}
        open={!!accessRep}
        onOpenChange={(open) => !open && setAccessRep(null)}
        onSuccess={onRefetch}
      />
    </>
  );
}
