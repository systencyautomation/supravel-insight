import { useState } from 'react';
import { Mail, Phone, FileText, MoreVertical, Trash2, UserCheck, UserX } from 'lucide-react';
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
import { Representative } from '@/hooks/useRepresentatives';
import { cn } from '@/lib/utils';

interface RepresentativesListProps {
  representatives: Representative[];
  onUpdate: (id: string, data: { active: boolean }) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export function RepresentativesList({ representatives, onUpdate, onDelete }: RepresentativesListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{rep.name}</span>
                {!rep.active && (
                  <Badge variant="secondary" className="text-xs">Inativo</Badge>
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
                {rep.document && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {rep.document}
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
    </>
  );
}
