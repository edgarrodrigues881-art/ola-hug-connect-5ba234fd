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

  // Handle "Manter conectado" — if user chose not to stay logged in,
  // we use sessionStorage as a browser-close detector.
  // sessionStorage is cleared automatically when the browser/tab closes.
  // On mount: if "dg_remember_me" is "false" AND the sessionStorage flag is missing,
  // it means the browser was closed → clear the Supabase session.
  useEffect(() => {
    const remember = localStorage.getItem("dg_remember_me");
    const sessionAlive = sessionStorage.getItem("dg_session_alive");

    if (remember === "false" && !sessionAlive) {
      // Browser was closed since last login — clear auth
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      if (projectId) {
        localStorage.removeItem(`sb-${projectId}-auth-token`);
      }
      localStorage.removeItem("dg_remember_me");
    }

    // Always set the flag so we know the tab is still open
    if (remember === "false") {
      sessionStorage.setItem("dg_session_alive", "true");
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // 1. Set up listener FIRST (before getSession) per Supabase best practices
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!isMounted) return;

        // Only clear session on explicit sign out
        if (event === "SIGNED_OUT") {
          setSession(null);
          setUser(null);
          return;
        }

        // For all other events, only update if we have a valid session
        if (newSession) {
          setSession(newSession);
          setUser(newSession.user ?? null);
        }
      }
    );

    // 2. INITIAL load – controls loading state
    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!isMounted) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (err) {
        console.error("Error initializing auth:", err);
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
