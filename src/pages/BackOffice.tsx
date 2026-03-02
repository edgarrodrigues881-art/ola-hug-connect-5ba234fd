import { useState, useEffect } from "react";
import { Lock, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import BackOfficeDashboard from "@/components/backoffice/BackOfficeDashboard";

const BackOffice = () => {
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    const checkAdminRole = async (userId: string) => {
      try {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();
        if (isMounted) setIsAdmin(!!data);
      } catch {
        if (isMounted) setIsAdmin(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        if (newSession?.user) {
          setTimeout(() => checkAdminRole(newSession.user.id), 0);
        } else {
          setIsAdmin(false);
        }
      }
    );

    const initializeAuth = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!isMounted) return;
        setSession(s);
        if (s?.user) {
          await checkAdminRole(s.user.id);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogging(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
      toast({ title: "Credenciais inválidas", variant: "destructive" });
    }
    setLogging(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast({ title: "Digite seu e-mail", variant: "destructive" }); return; }
    setResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetting(false);
    if (error) {
      toast({ title: "Erro ao enviar e-mail", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "E-mail enviado!", description: "Verifique sua caixa de entrada para redefinir a senha." });
      setShowReset(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
        {showReset ? (
          <form onSubmit={handleReset} className="w-full max-w-sm space-y-4 bg-zinc-800 p-8 rounded-2xl border border-zinc-700">
            <div className="flex items-center gap-2 justify-center text-purple-400 mb-2">
              <Lock size={24} />
              <h1 className="text-xl font-bold text-zinc-100">Redefinir Senha</h1>
            </div>
            <p className="text-sm text-zinc-400 text-center">Digite seu e-mail para receber o link de redefinição.</p>
            <Input
              placeholder="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-900 border-zinc-700 text-zinc-100"
            />
            <Button type="submit" disabled={resetting} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
              {resetting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Enviar Link
            </Button>
            <button type="button" onClick={() => setShowReset(false)} className="w-full text-sm text-purple-400 hover:underline">
              Voltar ao login
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4 bg-zinc-800 p-8 rounded-2xl border border-zinc-700">
            <div className="flex items-center gap-2 justify-center text-purple-400 mb-2">
              <Lock size={24} />
              <h1 className="text-xl font-bold text-zinc-100">Back-Office</h1>
            </div>
            <Input
              placeholder="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-900 border-zinc-700 text-zinc-100"
            />
            <Input
              type="password"
              placeholder="Senha"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="bg-zinc-900 border-zinc-700 text-zinc-100"
            />
            <Button type="submit" disabled={logging} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
              {logging ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Entrar
            </Button>
            <button type="button" onClick={() => setShowReset(true)} className="w-full text-sm text-zinc-400 hover:text-purple-400">
              Esqueci minha senha
            </button>
          </form>
        )}
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center gap-4 text-zinc-100">
        <p className="text-lg">⛔ Acesso restrito a administradores.</p>
        <Button variant="outline" onClick={handleLogout} className="border-zinc-600 text-zinc-300">
          <LogOut size={16} className="mr-1" /> Sair
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <h1 className="text-lg font-bold text-foreground tracking-tight">DG Control Center</h1>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-zinc-400 hover:text-zinc-100">
          <LogOut size={16} className="mr-1" /> Sair
        </Button>
      </header>
      <BackOfficeDashboard />
    </div>
  );
};

export default BackOffice;
