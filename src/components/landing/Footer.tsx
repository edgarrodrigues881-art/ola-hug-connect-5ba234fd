import logo from "@/assets/logo.png";

const Footer = () => (
  <footer className="border-t border-border py-8">
    <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <img src={logo} alt="DG Contingência" className="w-7 h-7 rounded-lg" />
        <span className="text-sm font-medium text-foreground">DG Contingência</span>
      </div>
      <p className="text-xs text-muted-foreground">
        © {new Date().getFullYear()} DG Contingência. Todos os direitos reservados.
      </p>
    </div>
  </footer>
);

export default Footer;
