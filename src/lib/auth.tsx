import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isSigningOut = useRef(false);

  // Single effect: init auth + handle "Manter conectado"
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      // 1. Check "remember me" BEFORE doing anything
      const remember = localStorage.getItem("dg_remember_me");
      const sessionAlive = sessionStorage.getItem("dg_session_alive");
      const shouldClearSession = remember === "false" && !sessionAlive;

      if (shouldClearSession) {
        // Clear EVERYTHING before Supabase client can use the token
        localStorage.removeItem("dg_remember_me");
        sessionStorage.removeItem("dg_session_alive");
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        if (projectId) {
          localStorage.removeItem(`sb-${projectId}-auth-token`);
        }
        // Sign out to clear Supabase client internal state
        try {
          await supabase.auth.signOut();
        } catch {
          // Ignore errors during cleanup signout
        }
        if (isMounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
        return null; // No need to set up listener
      }

      // 2. Normal flow: get session first
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!isMounted) return null;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (remember === "false") {
          sessionStorage.setItem("dg_session_alive", "true");
        }
      } catch (err) {
        console.error("Error initializing auth:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }

      // 3. Set up listener AFTER initial load (for ongoing changes only)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, newSession) => {
          if (!isMounted) return;

          if (event === "SIGNED_OUT") {
            setSession(null);
            setUser(null);
            return;
          }

          if (newSession) {
            setSession(newSession);
            setUser(newSession.user ?? null);
          }
        }
      );

      return subscription;
    };

    let subscription: ReturnType<typeof supabase.auth.onAuthStateChange>["data"]["subscription"] | null = null;

    initAuth().then((sub) => {
      subscription = sub;
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    isSigningOut.current = true;
    localStorage.removeItem("dg_remember_me");
    sessionStorage.removeItem("dg_session_alive");
    setSession(null);
    setUser(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      // Preserve current path so user returns here after login
      const currentPath = window.location.pathname + window.location.search;
      const redirectParam = currentPath !== "/auth" ? `?redirect=${encodeURIComponent(currentPath)}` : "";
      navigate(`/auth${redirectParam}`, { replace: true });
    }
  }, [session, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) return null;

  return <>{children}</>;
};
