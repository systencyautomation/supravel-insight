import { useMemo, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

export function useApprovalProfiles(approverIds: (string | null)[]) {
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(false);

  // Get unique non-null IDs
  const uniqueIds = useMemo(() => {
    const ids = new Set<string>();
    approverIds.forEach(id => {
      if (id) ids.add(id);
    });
    return Array.from(ids);
  }, [approverIds]);

  useEffect(() => {
    if (uniqueIds.length === 0) {
      setProfiles(new Map());
      return;
    }

    const fetchProfiles = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', uniqueIds);

        if (error) {
          console.error('Error fetching approval profiles:', error);
          return;
        }

        const profileMap = new Map<string, Profile>();
        data?.forEach(profile => {
          profileMap.set(profile.id, profile);
        });
        setProfiles(profileMap);
      } catch (err) {
        console.error('Error in useApprovalProfiles:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [uniqueIds]);

  const getProfile = (id: string | null): Profile | null => {
    if (!id) return null;
    return profiles.get(id) || null;
  };

  return { profiles, getProfile, loading };
}
