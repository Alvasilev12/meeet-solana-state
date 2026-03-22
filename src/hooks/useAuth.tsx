import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/runtime-client";

type AuthUser = any;
type AuthSession = any;

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authClient = supabase.auth as any;
    let isMounted = true;

    const applyValidatedSession = async (nextSession: AuthSession | null) => {
      if (!isMounted) return;

      if (!nextSession?.access_token) {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      const { data, error } = await authClient.getUser();
      if (!isMounted) return;

      if (error || !data?.user?.id) {
        await authClient.signOut({ scope: "local" }).catch(() => {});
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setSession(nextSession);
      setUser(data.user);
      setLoading(false);
    };

    const {
      data: { subscription },
    } = authClient.onAuthStateChange((_event: any, nextSession: AuthSession) => {
      void applyValidatedSession(nextSession);
    });

    authClient
      .getSession()
      .then(({ data: { session: currentSession } }: { data: { session: AuthSession } }) => {
        void applyValidatedSession(currentSession);
      })
      .catch(() => {
        if (!isMounted) return;
        setSession(null);
        setUser(null);
        setLoading(false);
      });

    return () => {
      isMounted = false;
      subscription?.unsubscribe?.();
    };
  }, []);

  const signOut = async () => {
    const authClient = supabase.auth as any;
    await authClient.signOut();
  };

  return <AuthContext.Provider value={{ user, session, loading, signOut }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
