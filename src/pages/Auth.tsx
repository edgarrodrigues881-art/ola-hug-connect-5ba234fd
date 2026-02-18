import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Lock, User, ShieldCheck, MessageCircle, Phone } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import logo from "@/assets/logo.png";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get("mode") !== "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    setIsLogin(searchParams.get("mode") !== "signup");
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter no mínimo 8 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "A senha e a confirmação devem ser iguais.",
        variant: "destructive",
      });
      return;
    }

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
            data: {
              full_name: fullName.trim(),
              phone: phone.trim(),
            },
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

  const inputClass = "pl-11 h-12 rounded-xl border-[#1E2330] bg-[#151821] text-[#E5E7EB] placeholder:text-[#9CA3AF]/40 focus:border-[#22C55E] focus:ring-0 transition-colors duration-150";

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative" style={{ backgroundColor: '#0F1115' }}>
      {/* Back button */}
      <button
        onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")}
        className="absolute top-6 left-6 flex items-center gap-2 text-sm text-[#9CA3AF] hover:text-[#22C55E] transition-colors duration-150"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      {/* Main card */}
      <div className="w-full max-w-[420px] auth-card-fade-in">
        {/* Logo + brand */}
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="DG Contingência" className="w-10 h-10 rounded-xl mb-3" />
          <span className="text-xs font-medium tracking-wide text-[#9CA3AF]">DG Contingência</span>
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#E5E7EB] mb-1.5">
            {isLogin ? "Bem-vindo de volta" : "Crie sua conta"}
          </h1>
          <p className="text-sm text-[#9CA3AF]">
            {isLogin
              ? "Entre para gerenciar seus disparos"
              : "Comece a enviar mensagens profissionais"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs font-medium text-[#9CA3AF]">
                  Nome completo
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]/50" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={inputClass}
                    required
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-medium text-[#9CA3AF]">
                  Número de telefone
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]/50" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputClass}
                    required
                    maxLength={20}
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium text-[#9CA3AF]">
              Endereço de e-mail
            </Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]/50" />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                required
                maxLength={255}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium text-[#9CA3AF]">
              Senha de acesso
            </Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]/50" />
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                required
                minLength={8}
              />
            </div>
            {isLogin && (
              <button
                type="button"
                className="text-xs text-[#9CA3AF] hover:text-[#22C55E] transition-colors duration-150 mt-1"
              >
                Esqueceu sua senha?
              </button>
            )}
          </div>

          {!isLogin && (
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-medium text-[#9CA3AF]">
                Confirmar senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]/50" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  required
                  minLength={8}
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 text-sm font-semibold rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-white shadow-sm transition-colors duration-150 border-0"
            style={{ boxShadow: '0 2px 8px rgba(34, 197, 94, 0.15)' }}
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              isLogin ? "Entrar" : "Criar conta"
            )}
          </Button>
        </form>

        {/* Security microcopy */}
        <div className="flex items-center justify-center gap-1.5 mt-4 text-[11px] text-[#9CA3AF]/60">
          <ShieldCheck className="w-3 h-3" />
          <span>Ambiente seguro e criptografado</span>
        </div>

        {/* Divider */}
        <div className="my-6 border-t border-[#1E2330]" />

        {/* Toggle */}
        <p className="text-center text-sm text-[#9CA3AF]">
          {isLogin ? "Não tem conta? " : "Já tem conta? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-[#22C55E] hover:text-[#16A34A] font-medium transition-colors duration-150"
          >
            {isLogin ? "Criar agora" : "Faça login"}
          </button>
        </p>
      </div>

      {/* Floating support button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => window.open("https://wa.me/5562994192500?text=Ol%C3%A1%20DG%2C%20vim%20do%20site%20e%20preciso%20de%20suporte!", "_blank")}
              className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-[#166534] hover:bg-[#15803d] flex items-center justify-center transition-colors duration-150 shadow-lg"
            >
              <MessageCircle className="w-5 h-5 text-white" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            Precisa de ajuda?
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default Auth;
