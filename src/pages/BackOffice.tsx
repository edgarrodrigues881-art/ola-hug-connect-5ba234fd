import { useState } from "react";
import { Lock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import BackOfficeDashboard from "@/components/backoffice/BackOfficeDashboard";

const BackOffice = () => {
  const [loggedIn, setLoggedIn] = useState(() => sessionStorage.getItem("bo_auth") === "1");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (user === "admin" && pass === "123456") {
      sessionStorage.setItem("bo_auth", "1");
      setLoggedIn(true);
    } else {
      toast({ title: "Credenciais inválidas", variant: "destructive" });
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("bo_auth");
    setLoggedIn(false);
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4 bg-zinc-800 p-8 rounded-2xl border border-zinc-700">
          <div className="flex items-center gap-2 justify-center text-purple-400 mb-2">
            <Lock size={24} />
            <h1 className="text-xl font-bold text-zinc-100">Back-Office</h1>
          </div>
          <Input
            placeholder="Usuário"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            className="bg-zinc-900 border-zinc-700 text-zinc-100"
          />
          <Input
            type="password"
            placeholder="Senha"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className="bg-zinc-900 border-zinc-700 text-zinc-100"
          />
          <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white">
            Entrar
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <h1 className="text-lg font-bold text-purple-400">⚙️ Back-Office SaaS</h1>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-zinc-400 hover:text-zinc-100">
          <LogOut size={16} className="mr-1" /> Sair
        </Button>
      </header>
      <BackOfficeDashboard />
    </div>
  );
};

export default BackOffice;
