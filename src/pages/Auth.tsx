import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Mail, Lock, User, ShieldCheck } from "lucide-react";
import logo from "@/assets/logo.png";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get("mode") !== "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    setIsLogin(searchParams.get("mode") !== "signup");
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({
          title: "Conta criada!",
          description: "Verifique seu email para confirmar o cadastro.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 auth-gradient items-center justify-center p-12 relative overflow-hidden">
        {/* Background accents */}
        <div className="glow-dot absolute w-[500px] h-[500px] -top-32 -right-32 animate-pulse-glow" />
        <div className="glow-dot absolute w-[300px] h-[300px] bottom-10 -left-10 animate-pulse-glow" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(0 0% 100% / 0.03) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }} />

        <div className="relative z-10 max-w-md animate-fade-up">
          <div className="flex items-center gap-4 mb-10">
            <img src={logo} alt="DG Contingência Pro" className="w-16 h-16 rounded-2xl shadow-2xl" />
            <div>
              <h1 className="text-2xl font-bold text-white">DG Contingência</h1>
              <span className="text-sm font-semibold text-gradient">Pro</span>
            </div>
          </div>
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-5">
            Dispare mensagens com{" "}
            <span className="text-gradient">segurança</span> e controle
          </h2>
          <p className="text-white/50 text-lg leading-relaxed">
            Conecte seu chip via QR Code e gerencie todos os seus disparos em uma única plataforma profissional.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-background">
        <div className="w-full max-w-md animate-fade-up">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10 justify-center">
            <img src={logo} alt="DG Contingência Pro" className="w-12 h-12 rounded-xl" />
            <span className="text-xl font-bold text-foreground">DG Contingência Pro</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              {isLogin ? "Bem-vindo de volta" : "Crie sua conta"}
            </h2>
            <p className="text-muted-foreground mt-1.5">
              {isLogin
                ? "Entre para gerenciar seus disparos"
                : "Comece a enviar mensagens profissionais"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium text-foreground">
                  Nome completo
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-11 h-12 rounded-xl bg-muted border-border focus:border-primary focus:ring-primary/20"
                    required={!isLogin}
                    maxLength={100}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-12 rounded-xl bg-muted border-border focus:border-primary focus:ring-primary/20"
                  required
                  maxLength={255}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 h-12 rounded-xl bg-muted border-border focus:border-primary focus:ring-primary/20"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-[52px] text-base font-semibold gap-2 rounded-xl shadow-lg shadow-primary/20"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <>
                  {isLogin ? "Entrar" : "Criar conta"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Microcopy */}
          <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Ambiente seguro e criptografado</span>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin
                ? "Não tem conta? Criar agora"
                : "Já tem conta? Faça login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
