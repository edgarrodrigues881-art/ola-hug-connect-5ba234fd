import logo from "@/assets/logo.png";

const Footer = () => (
  <footer className="border-t border-border py-10 bg-background">
    <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <img src={logo} alt="DG Contingência Pro" className="w-8 h-8 rounded-lg" />
        <span className="text-sm font-semibold text-foreground">DG Contingência Pro</span>
      </div>
      <p className="text-xs text-muted-foreground">
        © {new Date().getFullYear()} DG Contingência Pro. Todos os direitos reservados.
      </p>
    </div>
  </footer>
);

export default Footer;
