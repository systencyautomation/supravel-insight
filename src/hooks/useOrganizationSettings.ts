import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface OrganizationSettings {
  // Campos IMAP
  imap_host: string;
  imap_port: number;
  imap_user: string;
  imap_password: string;
  automation_active: boolean;
  imap_allowed_emails: string[];
  
  // Dados cadastrais
  cnpj: string;
  razao_social: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone: string;
  email_contato: string;
  
  // Parametrização de comissões
  comissao_base: 'valor_tabela' | 'comissao_empresa';
  comissao_over_percent: number;
  
  // IA
  ai_api_key: string;
}

interface UseOrganizationSettingsReturn {
  settings: OrganizationSettings | null;
  loading: boolean;
  saving: boolean;
  testing: boolean;
  updateSettings: (settings: Partial<OrganizationSettings>) => Promise<boolean>;
  testConnection: (settings: OrganizationSettings) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useOrganizationSettings(): UseOrganizationSettingsReturn {
  const { effectiveOrgId } = useAuth();
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!effectiveOrgId) {
      setSettings(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('organizations')
        .select('imap_host, imap_port, imap_user, imap_password, automation_active, imap_allowed_emails, cnpj, razao_social, endereco, cidade, estado, cep, telefone, email_contato, comissao_base, comissao_over_percent, ai_api_key')
        .eq('id', effectiveOrgId)
        .single();

      if (error) throw error;

      setSettings({
        imap_host: data.imap_host || 'imap.hostgator.com.br',
        imap_port: data.imap_port || 993,
        imap_user: data.imap_user || '',
        imap_password: data.imap_password || '',
        automation_active: data.automation_active || false,
        imap_allowed_emails: data.imap_allowed_emails || [],
        // Dados cadastrais
        cnpj: data.cnpj || '',
        razao_social: data.razao_social || '',
        endereco: data.endereco || '',
        cidade: data.cidade || '',
        estado: data.estado || '',
        cep: data.cep || '',
        telefone: data.telefone || '',
        email_contato: data.email_contato || '',
        // Parametrização
        comissao_base: (data.comissao_base as 'valor_tabela' | 'comissao_empresa') || 'valor_tabela',
        comissao_over_percent: data.comissao_over_percent ?? 10,
        // IA
        ai_api_key: data.ai_api_key || '',
      });
    } catch (error) {
      console.error('Error fetching organization settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }, [effectiveOrgId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (newSettings: Partial<OrganizationSettings>): Promise<boolean> => {
    if (!effectiveOrgId) {
      toast.error('Organização não encontrada');
      return false;
    }

    try {
      setSaving(true);
      
      console.log('Salvando configurações IMAP:', { effectiveOrgId, newSettings });
      
      const { data, error } = await supabase
        .from('organizations')
        .update(newSettings)
        .eq('id', effectiveOrgId)
        .select()
        .single();

      console.log('Resultado do UPDATE:', { data, error });

      if (error) throw error;
      
      if (!data) {
        console.error('UPDATE não retornou dados - possível problema de permissão RLS');
        toast.error('Erro: configurações não foram salvas. Verifique suas permissões.');
        return false;
      }

      setSettings(prev => prev ? { ...prev, ...newSettings } : null);
      toast.success('Configurações salvas com sucesso');
      return true;
    } catch (error) {
      console.error('Error updating organization settings:', error);
      toast.error('Erro ao salvar configurações');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (testSettings: OrganizationSettings): Promise<boolean> => {
    try {
      setTesting(true);
      
      const { data, error } = await supabase.functions.invoke('test-imap-connection', {
        body: {
          host: testSettings.imap_host,
          port: testSettings.imap_port,
          user: testSettings.imap_user,
          password: testSettings.imap_password,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Conexão estabelecida com sucesso!');
        return true;
      } else {
        toast.error(data.error || 'Falha na conexão');
        return false;
      }
    } catch (error) {
      console.error('Error testing IMAP connection:', error);
      toast.error('Erro ao testar conexão');
      return false;
    } finally {
      setTesting(false);
    }
  };

  return {
    settings,
    loading,
    saving,
    testing,
    updateSettings,
    testConnection,
    refetch: fetchSettings,
  };
}
