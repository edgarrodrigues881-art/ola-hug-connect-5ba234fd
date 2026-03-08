import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Lock, User, ShieldCheck, MessageCircle, Phone, Eye, EyeOff, Building2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import logo from "@/assets/logo.png";

const translateAuthError = (msg: string): string => {
  const map: Record<string, string> = {
    "Invalid login credentials": "E-mail ou senha incorretos.",
    "Email not confirmed": "E-mail ainda não confirmado. Verifique sua caixa de entrada.",
    "User already registered": "Este e-mail já está cadastrado.",
    "Signup requires a valid password": "Informe uma senha válida.",
    "Password should be at least 6 characters": "A senha deve ter no mínimo 6 caracteres.",
    "Email rate limit exceeded": "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    "For security purposes, you can only request this after 60 seconds.": "Por segurança, aguarde 60 segundos antes de tentar novamente.",
    "User not found": "Usuário não encontrado.",
    "New password should be different from the old password.": "A nova senha deve ser diferente da anterior.",
  };
  return map[msg] || msg;
};

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get("mode") !== "signup");
  const [showForgot, setShowForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast({
        title: "Informe seu e-mail",
        description: "Digite seu e-mail para recuperar a senha.",
        variant: "destructive",
      });
      return;
    }
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({
        title: "E-mail enviado!",
        description: "Verifique sua caixa de entrada para redefinir a senha.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: translateAuthError(error.message),
        variant: "destructive",
      });
    } finally {
      setForgotLoading(false);
    }
  };

  useEffect(() => {
    setIsLogin(searchParams.get("mode") !== "signup");
    setShowForgot(false);
  }, [searchParams]);

  const redirectTo = searchParams.get("redirect") || "/dashboard";

  // Auto-redirect if already logged in (check once on mount)
  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      // Validate the session is actually usable
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        navigate(redirectTo, { replace: true });
      }
    };
    checkExistingSession();
  }, [navigate, redirectTo]);

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
        localStorage.setItem("dg_remember_me", rememberMe ? "true" : "false");
        if (!rememberMe) {
          sessionStorage.setItem("dg_session_alive", "true");
        } else {
          sessionStorage.removeItem("dg_session_alive");
        }
        navigate(`/welcome?to=${encodeURIComponent(redirectTo)}`);
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone: phone.trim(),
              company: company.trim(),
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
      const msg = translateAuthError(error.message);
      toast({
        title: "Erro",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "pl-11 h-[52px] rounded-2xl border-[#1E2330] bg-[#151821]/80 text-white text-sm font-medium placeholder:text-[#6B7280] focus:border-[#22C55E]/60 focus:bg-[#151821] focus:ring-1 focus:ring-[#22C55E]/20 transition-all duration-200";


  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" style={{ backgroundColor: '#0F1115' }}>
      {/* Galactic green background */}
      <div className="fixed inset-0 pointer-events-none" style={{ contain: 'strict' }}>
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 20% 15%, hsl(142 70% 30% / 0.35) 0%, transparent 55%),
              radial-gradient(ellipse 60% 50% at 80% 25%, hsl(160 70% 25% / 0.25) 0%, transparent 50%),
              radial-gradient(ellipse 70% 50% at 50% 70%, hsl(130 50% 20% / 0.2) 0%, transparent 55%),
              radial-gradient(ellipse 90% 70% at 50% 40%, hsl(140 40% 12% / 0.35) 0%, transparent 65%)
            `,
          }}
        />
      </div>
      {/* Back button */}
      <div className="absolute top-6 left-6 z-10">
        <button
          onClick={() => showForgot ? setShowForgot(false) : navigate("/")}
          className="flex items-center gap-2 text-sm font-medium text-[#9CA3AF] hover:text-white transition-colors duration-200 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
          Voltar
        </button>
      </div>

      {/* Main card */}
      <div className="w-full max-w-[440px] auth-card-fade-in">
        {/* Logo + brand */}
        <div className="flex flex-col items-center mb-10">
          <img src={logo} alt="DG Contingência" className="w-14 h-14 rounded-2xl mb-3 shadow-lg shadow-black/20" />
          <span className="text-xs font-semibold tracking-widest uppercase text-[#6B7280]">DG Contingência</span>
        </div>

        {showForgot ? (
          <>
            {/* Forgot password view */}
             <div className="text-center mb-8">
              <h1 className="text-2xl font-extrabold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Recuperar senha</h1>
              <p className="text-sm text-[#9CA3AF] font-medium">
                Informe seu e-mail e enviaremos um link para redefinir sua senha
              </p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="forgotEmail" className="text-xs font-semibold text-[#9CA3AF] tracking-wide uppercase">
                  Endereço de e-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]/50" />
                  <Input
                    id="forgotEmail"
                    type="email"
                    placeholder="seu@email.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className={inputClass}
                    required
                    maxLength={255}
                    autoFocus
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={forgotLoading}
                className="w-full h-[52px] text-sm font-bold rounded-2xl bg-[#22C55E] hover:bg-[#16A34A] active:scale-[0.98] text-white transition-all duration-200 border-0 tracking-wide"
                style={{ boxShadow: '0 4px 16px rgba(34, 197, 94, 0.2)' }}
              >
                {forgotLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Enviar link de recuperação"
                )}
              </Button>
            </form>

            <div className="flex items-center justify-center gap-1.5 mt-4 text-[11px] text-[#9CA3AF]/60">
              <ShieldCheck className="w-3 h-3" />
              <span>Ambiente seguro e criptografado</span>
            </div>

            <div className="my-6 border-t border-[#1E2330]" />

            <p className="text-center text-sm text-[#9CA3AF]">
              Lembrou a senha?{" "}
              <button
                onClick={() => setShowForgot(false)}
                className="text-[#22C55E] hover:text-[#16A34A] font-medium transition-colors duration-150"
              >
                Voltar ao login
              </button>
            </p>
          </>
        ) : (
          <>
            {/* Heading */}
            <div className="text-center mb-10">
              <h1 className="text-3xl sm:text-[32px] font-extrabold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {isLogin ? "Bem-vindo de volta" : "Crie sua conta"}
              </h1>
              <p className="text-sm text-[#9CA3AF] font-medium">
                {isLogin
                  ? "Entre para gerenciar seus disparos"
                  : "Comece a enviar mensagens profissionais"}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-xs font-semibold text-[#9CA3AF] tracking-wide">
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

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs font-semibold text-[#9CA3AF] tracking-wide">
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

                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-xs font-semibold text-[#9CA3AF] tracking-wide">
                      Nome fantasia
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]/50" />
                      <Input
                        id="company"
                        type="text"
                        placeholder="Nome da empresa"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className={inputClass}
                        required
                        maxLength={100}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold text-[#9CA3AF] tracking-wide">
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

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold text-[#9CA3AF] tracking-wide">
                  Senha de acesso
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]/50" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClass} pr-11`}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]/50 hover:text-[#9CA3AF] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {isLogin && (
                  <div className="flex items-center justify-between mt-2">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded-md border-[#1E2330] bg-[#151821] text-[#22C55E] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#22C55E]"
                      />
                      <span className="text-xs font-medium text-[#9CA3AF]">Manter conectado</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setShowForgot(true);
                      }}
                      className="text-xs font-medium text-[#9CA3AF] hover:text-[#22C55E] transition-colors duration-200"
                    >
                      Esqueceu sua senha?
                    </button>
                  </div>
                )}
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold text-[#9CA3AF] tracking-wide">
                    Confirmar senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]/50" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repita a senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`${inputClass} pr-11`}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]/50 hover:text-[#9CA3AF] transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-[52px] text-[15px] font-bold rounded-2xl bg-[#22C55E] hover:bg-[#16A34A] active:scale-[0.98] text-white transition-all duration-200 border-0 tracking-wide mt-2"
                style={{ boxShadow: '0 4px 20px rgba(34, 197, 94, 0.25)' }}
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
          </>
        )}
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
