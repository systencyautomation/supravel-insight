import { useState } from 'react';
import { ChevronDown, ChevronRight, Building2, Wrench, MoreVertical, Trash2, Edit, Plus } from 'lucide-react';
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
import { RepresentativeCompany, RepresentativePosition } from '@/hooks/useRepresentativeCompanies';
import { CompanyMember, useCompanyMembers, CreateMemberData } from '@/hooks/useCompanyMembers';
import { CompanyMemberRow } from './CompanyMemberRow';
import { AddMemberDialog } from './AddMemberDialog';
import { EditCompanyDialog } from './EditCompanyDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CompaniesListProps {
  companies: RepresentativeCompany[];
  onDeleteCompany: (id: string) => Promise<boolean>;
  onUpdateCompany: (id: string, data: Partial<{ name: string; cnpj: string; position: RepresentativePosition; is_technical: boolean }>) => Promise<boolean>;
  onRefetch: () => void;
}

interface CompanyItemProps {
  company: RepresentativeCompany;
  onDelete: (id: string) => Promise<boolean>;
  onUpdate: (id: string, data: Partial<{ name: string; cnpj: string; position: RepresentativePosition; is_technical: boolean }>) => Promise<boolean>;
  onMembersChange: () => void;
}

function CompanyItem({ company, onDelete, onUpdate, onMembersChange }: CompanyItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const { members, loading, createMember, updateMember, refetch } = useCompanyMembers(company.id);
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

  const handleSaveEdit = async (
    companyData: {
      name: string;
      cnpj?: string;
      position: RepresentativePosition;
      is_technical: boolean;
    },
    responsavelData?: {
      name: string;
      phone?: string;
      email?: string;
      is_technical: boolean;
    }
  ) => {
    // Update company
    const companySuccess = await onUpdate(company.id, {
      name: companyData.name,
      cnpj: companyData.cnpj || '',
      position: companyData.position,
      is_technical: companyData.is_technical,
    });

    if (!companySuccess) return false;

    // Update responsável if exists
    if (responsavelData && responsavel) {
      const memberSuccess = await updateMember(responsavel.id, {
        name: responsavelData.name,
        phone: responsavelData.phone,
        email: responsavelData.email,
        is_technical: responsavelData.is_technical,
      });

      if (!memberSuccess) return false;
    }

    onMembersChange();
    return true;
  };

  const handleUpdateMember = async (memberId: string, data: { name: string; phone?: string; is_technical: boolean }) => {
    const success = await updateMember(memberId, data);
    if (success) {
      onMembersChange();
    }
    return success;
  };

  const responsavel = members.find(m => m.role === 'responsavel');
  const funcionarios = members.filter(m => m.role === 'funcionario');
  const hasFuncionarios = funcionarios.length > 0;

  const positionLabel = company.position === 'indicador' ? 'Indicador' : 'Representante';
  const positionVariant = company.position === 'indicador' ? 'secondary' : 'default';

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="border rounded-lg overflow-hidden">
          <div className="flex flex-col">
            {/* Header clickable area */}
            <CollapsibleTrigger asChild disabled={!hasFuncionarios}>
              <div 
                className={`flex flex-col p-4 transition-colors ${hasFuncionarios ? 'hover:bg-muted/50 cursor-pointer' : ''}`}
              >
                {/* Line 1: Company info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Expansion arrow - only if has funcionarios */}
                    {hasFuncionarios ? (
                      <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    ) : (
                      <div className="w-6" />
                    )}
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{company.name}</span>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddMemberDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Membro
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
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

                {/* Line 2: Responsável info (always visible) */}
                {!loading && (
                  <div className="flex items-center gap-2 ml-14 mt-1 text-sm text-muted-foreground">
                    {responsavel ? (
                      <>
                        <span>{responsavel.name}</span>
                        {responsavel.is_technical && (
                          <Badge variant="secondary" className="text-xs gap-1 py-0 h-5">
                            <Wrench className="h-2.5 w-2.5" />
                            técnico
                          </Badge>
                        )}
                      </>
                    ) : (
                      <span className="italic">Sem responsável cadastrado</span>
                    )}
                  </div>
                )}
              </div>
            </CollapsibleTrigger>

            {/* Collapsible content - only funcionários */}
            <CollapsibleContent>
              <div className="border-t bg-muted/20 p-2">
                {loading ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    Carregando...
                  </div>
                ) : (
                  <>
                    {funcionarios.map((member) => (
                      <CompanyMemberRow 
                        key={member.id} 
                        member={member}
                        onUpdate={handleUpdateMember}
                      />
                    ))}
                    {funcionarios.length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-2">
                        Nenhum membro cadastrado
                      </div>
                    )}
                    <div className="px-4 pt-2 border-t mt-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="gap-1 h-7 text-xs"
                        onClick={() => setAddMemberDialogOpen(true)}
                      >
                        <Plus className="h-3 w-3" />
                        Adicionar Membro
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </div>
      </Collapsible>

      {/* Delete Dialog */}
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

      {/* Edit Dialog */}
      <EditCompanyDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        company={company}
        responsavel={responsavel}
        onSave={handleSaveEdit}
      />

      {/* Add Member Dialog */}
      <AddMemberDialog
        open={addMemberDialogOpen}
        onOpenChange={setAddMemberDialogOpen}
        companyName={company.name}
        onAdd={handleAddMember}
      />
    </>
  );
}

export function CompaniesList({ companies, onDeleteCompany, onUpdateCompany, onRefetch }: CompaniesListProps) {
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
          onUpdate={onUpdateCompany}
          onMembersChange={onRefetch}
        />
      ))}
    </div>
  );
}
