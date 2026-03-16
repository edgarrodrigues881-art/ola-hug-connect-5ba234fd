import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Lock, User, ShieldCheck, MessageCircle, Phone, Eye, EyeOff, Building2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import logo from "@/assets/logo-new.png";


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
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      toast({ title: "Informe seu e-mail", description: "Digite o e-mail cadastrado.", variant: "destructive" });
      return;
    }
    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: window.location.origin } });
      if (error) throw error;
      toast({ title: "E-mail reenviado!", description: "Verifique sua caixa de entrada (e spam) para confirmar o cadastro." });
      setShowResendConfirm(false);
    } catch (error: any) {
      toast({ title: "Erro", description: translateAuthError(error.message), variant: "destructive" });
    } finally {
      setResendLoading(false);
    }
  };

  useEffect(() => {
    setIsLogin(searchParams.get("mode") !== "signup");
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
        // Check if phone is already registered
        const trimmedPhone = phone.trim().replace(/\D/g, "");
        if (trimmedPhone) {
          const { data: phoneAvailable } = await supabase.rpc("check_phone_available", { _phone: trimmedPhone });
          if (phoneAvailable === false) {
            toast({
              title: "Telefone já cadastrado",
              description: "Este número de telefone já está vinculado a outra conta.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
        }

        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone: trimmedPhone,
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
      // Show resend button if email not confirmed
      if (error.message?.includes("Email not confirmed")) {
        setShowResendConfirm(true);
      }
      toast({
        title: "Erro",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "pl-11 h-[52px] rounded-2xl border-[#1E2330] bg-[#151821] text-white text-sm font-medium placeholder:text-[#6B7280] focus:border-[#22C55E] focus:bg-[#1a1e2a] focus:ring-1 focus:ring-[#22C55E]/40 transition-all duration-200";


  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #0F1115 0%, #0d1a12 50%, #0a1f0f 100%)' }}>
      {/* Back button */}
      <div className="absolute top-6 left-6 z-10">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm font-medium text-[#9CA3AF] hover:text-white transition-colors duration-200 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
          Voltar
        </button>
      </div>

      <div className="w-full max-w-[440px] flex flex-col items-center">
        {/* Logo + brand */}
        <div className="flex flex-col items-center mb-10">
          <img src={logo} alt="DG Contingência Pro" className="w-24 h-24 rounded-2xl mb-3" style={{ background: '#1a1a1a' }} />
          <span className="text-sm font-bold tracking-widest uppercase text-[#E5E7EB]"><span className="text-primary">DG</span> CONTINGÊNCIA <span className="text-primary">PRO</span></span>
        </div>

        {/* Main card */}
        <div className="w-full">

        
            {/* Heading */}
            <div className="text-center mb-10">
              <h1 className="text-3xl sm:text-[32px] font-extrabold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {isLogin ? "Bem-vindo" : "Crie sua conta"}
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

              {/* Resend confirmation email */}
              {showResendConfirm && isLogin && (
                <div className="mt-3 p-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 text-center space-y-2">
                  <p className="text-sm text-yellow-200 font-medium">
                    Seu e-mail ainda não foi confirmado.
                  </p>
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resendLoading}
                    className="w-full py-2.5 rounded-xl text-sm font-bold bg-[#22C55E] hover:bg-[#16A34A] text-white transition-all"
                  >
                    {resendLoading ? "Reenviando..." : "📧 Reenviar e-mail de confirmação"}
                  </button>
                </div>
              )}
            </form>

            {/* Security microcopy */}
            <div className="flex items-center justify-center gap-2 mt-5 text-[11px] text-[#9CA3AF] font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Ambiente seguro e criptografado</span>
            </div>

            {/* Divider */}
            <div className="my-7 border-t border-[#1E2330]" />

            <p className="text-center text-sm font-medium text-[#9CA3AF]">
              {isLogin ? "Não tem conta? " : "Já tem conta? "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-[#22C55E] hover:text-[#16A34A] font-bold transition-colors duration-200"
              >
                {isLogin ? "Criar agora" : "Faça login"}
              </button>
            </p>
      </div>

      {/* WhatsApp support button */}
      <a
        href="https://wa.me/5562994192500?text=Ol%C3%A1%2C%20vim%20do%20site%20da%20DG%20Conting%C3%AAncia%20PRO%20e%20preciso%20de%20suporte."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary hover:bg-[hsl(142,71%,38%)] flex items-center justify-center transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>

      </div>
    </motion.div>
  );
};

export default Auth;
