import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'super_admin' | 'admin' | 'manager' | 'seller' | 'representative';

const MASTER_EMAIL = 'systency.automation@gmail.com';

interface UserRole {
  role: AppRole;
  organization_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRoles: UserRole[];
  organizationId: string | null;
  isSuperAdmin: boolean;
  isMasterAdmin: boolean;
  impersonatedOrgId: string | null;
  impersonatedOrgName: string | null;
  effectiveOrgId: string | null;
  setImpersonatedOrg: (orgId: string | null, orgName: string | null) => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [impersonatedOrgId, setImpersonatedOrgId] = useState<string | null>(null);
  const [impersonatedOrgName, setImpersonatedOrgName] = useState<string | null>(null);

  const organizationId = userRoles.find(r => r.organization_id)?.organization_id ?? null;
  const isSuperAdmin = userRoles.some(r => r.role === 'super_admin');
  const isMasterAdmin = user?.email === MASTER_EMAIL;
  
  // Effective org is impersonated org if set, otherwise user's actual org
  const effectiveOrgId = impersonatedOrgId ?? organizationId;

  const setImpersonatedOrg = (orgId: string | null, orgName: string | null) => {
    setImpersonatedOrgId(orgId);
    setImpersonatedOrgName(orgName);
  };

  const fetchUserRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role, organization_id')
      .eq('user_id', userId);

    if (!error && data) {
      setUserRoles(data as UserRole[]);
    }
  };

  const refreshRoles = async () => {
    if (user) {
      await fetchUserRoles(user.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (session?.user) {
          setTimeout(() => {
            fetchUserRoles(session.user.id);
          }, 0);
        } else {
          setUserRoles([]);
          setImpersonatedOrgId(null);
          setImpersonatedOrgName(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        fetchUserRoles(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserRoles([]);
    setImpersonatedOrgId(null);
    setImpersonatedOrgName(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      userRoles,
      organizationId,
      isSuperAdmin,
      isMasterAdmin,
      impersonatedOrgId,
      impersonatedOrgName,
      effectiveOrgId,
      setImpersonatedOrg,
      signIn,
      signUp,
      signOut,
      refreshRoles
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
