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
    let isClearing = false;

    // 1. Check "remember me" BEFORE doing anything
    const remember = localStorage.getItem("dg_remember_me");
    const sessionAlive = sessionStorage.getItem("dg_session_alive");
    const shouldClearSession = remember === "false" && !sessionAlive;

    // If we need to clear, do it FIRST before setting up any listeners
    // This prevents the listener from reacting to the signOut
    if (shouldClearSession) {
      isClearing = true;
      localStorage.removeItem("dg_remember_me");
      sessionStorage.removeItem("dg_session_alive");
      // Clear the token synchronously to prevent Supabase client from using it
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      if (projectId) {
        localStorage.removeItem(`sb-${projectId}-auth-token`);
      }
    }

    // 2. Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!isMounted || isClearing) return;

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

    // 3. Init auth
    const initAuth = async () => {
      try {
        if (shouldClearSession) {
          // Sign out properly, then allow listener to work
          await supabase.auth.signOut();
          isClearing = false;
          if (isMounted) {
            setSession(null);
            setUser(null);
          }
        } else {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (!isMounted) return;
          setSession(currentSession);
          setUser(currentSession?.user ?? null);

          // Set sessionStorage flag if remember is false (tab still open)
          if (remember === "false") {
            sessionStorage.setItem("dg_session_alive", "true");
          }
        }
      } catch (err) {
        console.error("Error initializing auth:", err);
        isClearing = false;
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    isSigningOut.current = true;
    localStorage.removeItem("dg_remember_me");
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
      navigate("/auth", { replace: true });
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
