import { useMemo, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SellerProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface Representative {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
}

export function useSellerProfiles() {
  const { effectiveOrgId } = useAuth();
  const [internalSellers, setInternalSellers] = useState<Map<string, SellerProfile>>(new Map());
  const [representatives, setRepresentatives] = useState<Map<string, Representative>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!effectiveOrgId) {
      setLoading(false);
      return;
    }

    const fetchProfiles = async () => {
      setLoading(true);
      try {
        // Buscar vendedores internos (usuários com role seller na organização)
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('organization_id', effectiveOrgId)
          .in('role', ['seller', 'manager', 'admin']);

        if (rolesError) {
          console.error('Error fetching user roles:', rolesError);
        } else if (userRoles) {
          const userIds = userRoles.map(r => r.user_id);
          
          if (userIds.length > 0) {
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('id, full_name, email')
              .in('id', userIds);

            if (profilesError) {
              console.error('Error fetching profiles:', profilesError);
            } else if (profiles) {
              const sellersMap = new Map<string, SellerProfile>();
              profiles.forEach(p => {
                sellersMap.set(p.id, p);
              });
              setInternalSellers(sellersMap);
            }
          }
        }

        // Buscar representantes externos (representative_companies)
        const { data: reps, error: repsError } = await supabase
          .from('representative_companies')
          .select('id, name, cnpj, position, sede')
          .eq('organization_id', effectiveOrgId)
          .eq('active', true);

        if (repsError) {
          console.error('Error fetching representative companies:', repsError);
        } else if (reps) {
          const repsMap = new Map<string, Representative>();
          reps.forEach(r => {
            repsMap.set(r.id, {
              id: r.id,
              name: r.name,
              company: r.name, // company name is the entity name
              email: null,
            });
          });
          setRepresentatives(repsMap);
        }
      } catch (err) {
        console.error('Error in useSellerProfiles:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [effectiveOrgId]);

  const getInternalSeller = (id: string | null): SellerProfile | null => {
    if (!id) return null;
    return internalSellers.get(id) || null;
  };

  const getRepresentative = (id: string | null): Representative | null => {
    if (!id) return null;
    return representatives.get(id) || null;
  };

  return { 
    internalSellers, 
    representatives, 
    getInternalSeller, 
    getRepresentative, 
    loading 
  };
}
