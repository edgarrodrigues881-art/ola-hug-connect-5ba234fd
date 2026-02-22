import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import logo from "@/assets/logo.png";

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container flex items-center justify-between h-16">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="DG Contingência" className="w-9 h-9 rounded-lg" />
          <span className="text-sm font-semibold text-foreground tracking-tight">
            DG Contingência
          </span>
        </div>

        <nav className="hidden sm:flex items-center gap-6">
          <button
            onClick={() => document.getElementById("recursos")?.scrollIntoView({ behavior: "smooth" })}
            className="text-sm text-muted-foreground hover:text-foreground transition-all duration-200"
          >
            Recursos
          </button>
          <button
            onClick={() => document.getElementById("para-quem")?.scrollIntoView({ behavior: "smooth" })}
            className="text-sm text-muted-foreground hover:text-foreground transition-all duration-200"
          >
            Para quem
          </button>
          <button
            onClick={() => navigate("/planos")}
            className="text-sm text-muted-foreground hover:text-foreground transition-all duration-200"
          >
            Planos
          </button>
          <button
            onClick={() => window.open("https://wa.me/5562994192500?text=Ol%C3%A1%20DG%2C%20vim%20do%20site%20e%20preciso%20de%20suporte!", "_blank")}
            className="text-sm text-muted-foreground hover:text-foreground transition-all duration-200 flex items-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Suporte
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/auth")}
            className="text-sm text-muted-foreground hover:text-foreground transition-all duration-200"
          >
            Entrar
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/auth?mode=signup")}
            className="text-sm bg-primary hover:bg-[hsl(142,71%,38%)] border-0 shadow-none transition-all duration-200"
          >
            Criar conta
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
