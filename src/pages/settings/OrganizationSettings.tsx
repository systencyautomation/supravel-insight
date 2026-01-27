import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SettingsLayout } from '@/layouts/SettingsLayout';
import { Loader2, Eye } from 'lucide-react';
import { CompanyDataForm } from '@/components/settings/CompanyDataForm';
import { CommissionParametersForm } from '@/components/settings/CommissionParametersForm';
import { useOrganizationSettings, type OrganizationSettings as OrgSettings } from '@/hooks/useOrganizationSettings';

export default function OrganizationSettings() {
  const { user, effectiveOrgId, impersonatedOrgName } = useAuth();
  const navigate = useNavigate();
  
  const [organizationName, setOrganizationName] = useState('');
  const [loadingOrg, setLoadingOrg] = useState(true);
  
  const { settings, loading: loadingSettings, saving, updateSettings } = useOrganizationSettings();

  useEffect(() => {
    if (!effectiveOrgId) {
      navigate('/settings/profile');
      return;
    }

    if (user) {
      fetchOrganizationName();
    }
  }, [user, effectiveOrgId, navigate]);

  const fetchOrganizationName = async () => {
    if (!effectiveOrgId) return;

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', effectiveOrgId)
        .maybeSingle();

      if (error) throw error;
      if (data) setOrganizationName(data.name);
    } catch (error) {
      console.error('Error fetching organization name:', error);
    } finally {
      setLoadingOrg(false);
    }
  };

  const handleSave = async (data: Partial<OrgSettings>): Promise<boolean> => {
    return updateSettings(data);
  };

  const isLoading = loadingOrg || loadingSettings;

  return (
    <SettingsLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {impersonatedOrgName && (
          <div className="flex items-center gap-3 p-4 bg-warning/10 border border-warning/20 rounded-xl">
            <Eye className="h-5 w-5 text-warning" />
            <span className="text-sm font-medium text-warning">
              Visualizando como: {impersonatedOrgName}
            </span>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : settings ? (
          <>
            <CompanyDataForm 
              settings={settings}
              organizationName={organizationName}
              saving={saving}
              onSave={handleSave}
            />
            
            <CommissionParametersForm
              settings={settings}
              saving={saving}
              onSave={handleSave}
            />
          </>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            Nenhuma organização encontrada.
          </div>
        )}
      </div>
    </SettingsLayout>
  );
}
