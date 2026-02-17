import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, LogIn, UserPlus, MessageCircle, HelpCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

const SupportButton = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const items = [
    {
      icon: LogIn,
      label: "Entrar",
      onClick: () => navigate("/auth"),
    },
    {
      icon: UserPlus,
      label: "Criar conta",
      onClick: () => navigate("/auth?mode=signup"),
    },
    {
      icon: MessageCircle,
      label: "Suporte via WhatsApp",
      onClick: () => window.open("https://wa.me/5500000000000", "_blank"),
    },
    {
      icon: HelpCircle,
      label: "Como funciona",
      onClick: () => {
        document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" });
        setOpen(false);
      },
    },
    {
      icon: Info,
      label: "Diferenciais",
      onClick: () => {
        document.getElementById("diferenciais")?.scrollIntoView({ behavior: "smooth" });
        setOpen(false);
      },
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Menu items */}
      {open && (
        <div className="flex flex-col gap-2 mb-1 animate-fade-up">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              className="flex items-center gap-3 bg-secondary border border-border rounded-lg px-4 py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors whitespace-nowrap shadow-lg"
            >
              <item.icon className="w-4 h-4 text-primary" />
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Toggle button */}
      <Button
        size="icon"
        className="h-14 w-14 rounded-full bg-primary hover:bg-[hsl(142,71%,38%)] shadow-lg transition-colors"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </Button>
    </div>
  );
};

export default SupportButton;
