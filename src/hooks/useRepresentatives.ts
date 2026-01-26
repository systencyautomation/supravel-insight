import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Representative {
  id: string;
  organization_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  active: boolean;
  user_id: string | null;
  created_at: string;
}

export interface CreateRepresentativeData {
  name: string;
  email?: string;
  phone?: string;
  document?: string;
}

export function useRepresentatives(organizationId: string | null) {
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRepresentatives = async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from('representatives')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;
      setRepresentatives(data || []);
    } catch (error) {
      console.error('Error fetching representatives:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os representantes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createRepresentative = async (data: CreateRepresentativeData) => {
    if (!organizationId) return null;

    try {
      const { data: newRep, error } = await supabase
        .from('representatives')
        .insert({
          organization_id: organizationId,
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          document: data.document || null,
        })
        .select()
        .single();

      if (error) throw error;

      setRepresentatives(prev => [...prev, newRep].sort((a, b) => a.name.localeCompare(b.name)));
      
      toast({
        title: 'Sucesso',
        description: 'Representante cadastrado com sucesso.',
      });

      return newRep;
    } catch (error) {
      console.error('Error creating representative:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível cadastrar o representante.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateRepresentative = async (id: string, data: Partial<CreateRepresentativeData & { active: boolean }>) => {
    try {
      const { error } = await supabase
        .from('representatives')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      setRepresentatives(prev => 
        prev.map(rep => rep.id === id ? { ...rep, ...data } : rep)
      );

      toast({
        title: 'Sucesso',
        description: 'Representante atualizado com sucesso.',
      });

      return true;
    } catch (error) {
      console.error('Error updating representative:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o representante.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteRepresentative = async (id: string) => {
    try {
      const { error } = await supabase
        .from('representatives')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRepresentatives(prev => prev.filter(rep => rep.id !== id));

      toast({
        title: 'Sucesso',
        description: 'Representante removido com sucesso.',
      });

      return true;
    } catch (error) {
      console.error('Error deleting representative:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o representante.',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchRepresentatives();
  }, [organizationId]);

  return {
    representatives,
    loading,
    createRepresentative,
    updateRepresentative,
    deleteRepresentative,
    refetch: fetchRepresentatives,
  };
}
