import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type MemberRole = 'responsavel' | 'funcionario';

export interface CompanyMember {
  id: string;
  company_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: MemberRole;
  is_technical: boolean;
  user_id: string | null;
  created_at: string;
}

export interface CreateMemberData {
  name: string;
  phone?: string;
  email?: string;
  role: MemberRole;
  is_technical: boolean;
}

export function useCompanyMembers(companyId: string | null) {
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMembers = async () => {
    if (!companyId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('company_members')
        .select('*')
        .eq('company_id', companyId)
        .order('role')
        .order('name');

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os membros.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createMember = async (data: CreateMemberData): Promise<CompanyMember | null> => {
    if (!companyId) return null;

    try {
      const { data: newMember, error } = await supabase
        .from('company_members')
        .insert({
          company_id: companyId,
          name: data.name,
          phone: data.phone || null,
          email: data.email || null,
          role: data.role,
          is_technical: data.is_technical,
        })
        .select()
        .single();

      if (error) throw error;

      setMembers(prev => [...prev, newMember].sort((a, b) => {
        if (a.role !== b.role) return a.role === 'responsavel' ? -1 : 1;
        return a.name.localeCompare(b.name);
      }));
      
      toast({
        title: 'Sucesso',
        description: data.role === 'responsavel' ? 'Responsável cadastrado com sucesso.' : 'Funcionário cadastrado com sucesso.',
      });

      return newMember;
    } catch (error) {
      console.error('Error creating member:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível cadastrar o membro.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateMember = async (id: string, data: Partial<CreateMemberData>) => {
    try {
      const { error } = await supabase
        .from('company_members')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      setMembers(prev => 
        prev.map(member => member.id === id ? { ...member, ...data } : member)
      );

      toast({
        title: 'Sucesso',
        description: 'Membro atualizado com sucesso.',
      });

      return true;
    } catch (error) {
      console.error('Error updating member:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o membro.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteMember = async (id: string) => {
    try {
      const { error } = await supabase
        .from('company_members')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMembers(prev => prev.filter(member => member.id !== id));

      toast({
        title: 'Sucesso',
        description: 'Membro removido com sucesso.',
      });

      return true;
    } catch (error) {
      console.error('Error deleting member:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o membro.',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [companyId]);

  return {
    members,
    loading,
    createMember,
    updateMember,
    deleteMember,
    refetch: fetchMembers,
  };
}

// Hook para buscar membros de múltiplas empresas
export function useAllCompanyMembers(companyIds: string[]) {
  const [membersMap, setMembersMap] = useState<Record<string, CompanyMember[]>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAllMembers = async () => {
    if (companyIds.length === 0) {
      setMembersMap({});
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('company_members')
        .select('*')
        .in('company_id', companyIds)
        .order('role')
        .order('name');

      if (error) throw error;

      const grouped = (data || []).reduce((acc, member) => {
        if (!acc[member.company_id]) {
          acc[member.company_id] = [];
        }
        acc[member.company_id].push(member);
        return acc;
      }, {} as Record<string, CompanyMember[]>);

      setMembersMap(grouped);
    } catch (error) {
      console.error('Error fetching all members:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os membros.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllMembers();
  }, [companyIds.join(',')]);

  return {
    membersMap,
    loading,
    refetch: fetchAllMembers,
  };
}
