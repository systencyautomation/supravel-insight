import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Building2, Wrench, MoreVertical, Trash2, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RepresentativeCompany } from '@/hooks/useRepresentativeCompanies';
import { CompanyMember, useCompanyMembers, CreateMemberData } from '@/hooks/useCompanyMembers';
import { CompanyMemberRow } from './CompanyMemberRow';
import { AddMemberDialog } from './AddMemberDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CompaniesListProps {
  companies: RepresentativeCompany[];
  onDeleteCompany: (id: string) => Promise<boolean>;
  onRefetch: () => void;
}

interface CompanyItemProps {
  company: RepresentativeCompany;
  onDelete: (id: string) => Promise<boolean>;
  onMembersChange: () => void;
}

function CompanyItem({ company, onDelete, onMembersChange }: CompanyItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { members, loading, createMember, refetch } = useCompanyMembers(company.id);
  const { toast } = useToast();

  const handleAddMember = async (data: CreateMemberData) => {
    const result = await createMember(data);
    if (result) {
      onMembersChange();
    }
    return result;
  };

  const handleDelete = async () => {
    const success = await onDelete(company.id);
    if (success) {
      setDeleteDialogOpen(false);
    }
  };

  const responsavel = members.find(m => m.role === 'responsavel');
  const funcionarios = members.filter(m => m.role === 'funcionario');

  const positionLabel = company.position === 'indicador' ? 'Indicador' : 'Representante';
  const positionVariant = company.position === 'indicador' ? 'secondary' : 'default';

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="border rounded-lg overflow-hidden">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <span className="font-medium">{company.name}</span>
                  {company.company_type === 'mei' && (
                    <Badge variant="outline" className="text-xs">MEI</Badge>
                  )}
                  <Badge variant={positionVariant as any} className="text-xs">
                    {positionLabel}
                  </Badge>
                  {company.is_technical && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Wrench className="h-3 w-3" />
                      Técnico
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {company.sede && (
                  <span className="text-sm text-muted-foreground">{company.sede}</span>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t bg-muted/20 p-2">
              {loading ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Carregando...
                </div>
              ) : (
                <>
                  {responsavel && <CompanyMemberRow member={responsavel} />}
                  {funcionarios.map((member) => (
                    <CompanyMemberRow key={member.id} member={member} />
                  ))}
                  {company.company_type === 'empresa' && (
                    <div className="px-4 pt-2">
                      <AddMemberDialog
                        companyName={company.name}
                        onAdd={handleAddMember}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá excluir a empresa "{company.name}" e todos os seus membros. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function CompaniesList({ companies, onDeleteCompany, onRefetch }: CompaniesListProps) {
  if (companies.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma empresa cadastrada.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {companies.map((company) => (
        <CompanyItem
          key={company.id}
          company={company}
          onDelete={onDeleteCompany}
          onMembersChange={onRefetch}
        />
      ))}
    </div>
  );
}
