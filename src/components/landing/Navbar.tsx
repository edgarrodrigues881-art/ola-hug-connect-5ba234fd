import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0D0D0D]/80 backdrop-blur-xl border-b border-white/5">
      <div className="container flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <img src={logo} alt="DG Contingência PRO" className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg" />
          <span className="text-xs sm:text-sm font-bold text-white tracking-tight whitespace-nowrap">
            Dg Contingencia <span className="text-[#07C160]">PRO</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <button
            onClick={() => document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" })}
            className="text-sm text-white/50 hover:text-white transition-colors"
          >
            Como funciona
          </button>
          <button
            onClick={() => navigate("/planos")}
            className="text-sm text-white/50 hover:text-white transition-colors"
          >
            Planos
          </button>
          <button
            onClick={() => document.getElementById("confianca")?.scrollIntoView({ behavior: "smooth" })}
            className="text-sm text-white/50 hover:text-white transition-colors"
          >
            Confiança
          </button>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/auth")}
            className="text-xs sm:text-sm text-white/60 hover:text-white hover:bg-white/5 px-2 sm:px-3"
          >
            Entrar
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/auth?mode=signup")}
            className="text-xs sm:text-sm bg-[#07C160] hover:bg-[#06a050] text-white px-3 sm:px-4"
          >
            Criar conta
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
