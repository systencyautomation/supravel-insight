import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type CompanyType = 'mei' | 'empresa';
export type RepresentativePosition = 'indicador' | 'representante';

export interface RepresentativeCompany {
  id: string;
  organization_id: string;
  name: string;
  cnpj: string | null;
  company_type: CompanyType;
  sede: string | null;
  position: RepresentativePosition;
  is_technical: boolean;
  active: boolean;
  created_at: string;
}

export interface CreateCompanyData {
  name: string;
  cnpj?: string;
  company_type: CompanyType;
  sede?: string;
  position: RepresentativePosition;
  is_technical: boolean;
}

export function useRepresentativeCompanies(organizationId: string | null) {
  const [companies, setCompanies] = useState<RepresentativeCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCompanies = async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from('representative_companies')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as empresas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createCompany = async (data: CreateCompanyData): Promise<RepresentativeCompany | null> => {
    if (!organizationId) return null;

    try {
      const { data: newCompany, error } = await supabase
        .from('representative_companies')
        .insert({
          organization_id: organizationId,
          name: data.name,
          cnpj: data.cnpj || null,
          company_type: data.company_type,
          sede: data.sede || null,
          position: data.position,
          is_technical: data.is_technical,
        })
        .select()
        .single();

      if (error) throw error;

      setCompanies(prev => [...prev, newCompany].sort((a, b) => a.name.localeCompare(b.name)));
      
      toast({
        title: 'Sucesso',
        description: 'Empresa cadastrada com sucesso.',
      });

      return newCompany;
    } catch (error) {
      console.error('Error creating company:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível cadastrar a empresa.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateCompany = async (id: string, data: Partial<CreateCompanyData & { active: boolean }>) => {
    try {
      const { error } = await supabase
        .from('representative_companies')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      setCompanies(prev => 
        prev.map(company => company.id === id ? { ...company, ...data } : company)
      );

      toast({
        title: 'Sucesso',
        description: 'Empresa atualizada com sucesso.',
      });

      return true;
    } catch (error) {
      console.error('Error updating company:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a empresa.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteCompany = async (id: string) => {
    try {
      const { error } = await supabase
        .from('representative_companies')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCompanies(prev => prev.filter(company => company.id !== id));

      toast({
        title: 'Sucesso',
        description: 'Empresa removida com sucesso.',
      });

      return true;
    } catch (error) {
      console.error('Error deleting company:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a empresa.',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [organizationId]);

  return {
    companies,
    loading,
    createCompany,
    updateCompany,
    deleteCompany,
    refetch: fetchCompanies,
  };
}
