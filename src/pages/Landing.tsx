import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import MetricsSection from "@/components/landing/MetricsSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const Landing = () => (
  <div className="landing-dark min-h-screen bg-background scroll-smooth relative overflow-hidden">
    {/* Galactic gradient background */}
    <div className="fixed inset-0 pointer-events-none z-0">
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 20% 10%, hsl(260 80% 30% / 0.25) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 80% 20%, hsl(220 90% 40% / 0.2) 0%, transparent 55%),
            radial-gradient(ellipse 70% 50% at 50% 60%, hsl(280 70% 25% / 0.18) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 90% 80%, hsl(200 80% 35% / 0.15) 0%, transparent 50%),
            radial-gradient(ellipse 40% 30% at 10% 90%, hsl(310 60% 30% / 0.12) 0%, transparent 50%)
          `,
        }}
      />
      {/* Starfield subtle dots */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            radial-gradient(1px 1px at 10% 15%, hsl(0 0% 100% / 0.4) 50%, transparent 50%),
            radial-gradient(1px 1px at 30% 45%, hsl(0 0% 100% / 0.3) 50%, transparent 50%),
            radial-gradient(1.5px 1.5px at 55% 10%, hsl(0 0% 100% / 0.5) 50%, transparent 50%),
            radial-gradient(1px 1px at 70% 65%, hsl(0 0% 100% / 0.35) 50%, transparent 50%),
            radial-gradient(1px 1px at 85% 30%, hsl(0 0% 100% / 0.25) 50%, transparent 50%),
            radial-gradient(1.5px 1.5px at 40% 80%, hsl(0 0% 100% / 0.4) 50%, transparent 50%),
            radial-gradient(1px 1px at 95% 55%, hsl(0 0% 100% / 0.3) 50%, transparent 50%),
            radial-gradient(1px 1px at 15% 70%, hsl(0 0% 100% / 0.2) 50%, transparent 50%),
            radial-gradient(1.5px 1.5px at 60% 90%, hsl(0 0% 100% / 0.35) 50%, transparent 50%),
            radial-gradient(1px 1px at 25% 25%, hsl(0 0% 100% / 0.3) 50%, transparent 50%)
          `,
          backgroundSize: '100% 100%',
        }}
      />
    </div>

    <div className="relative z-10">
      <Navbar />
      <HeroSection />
      <MetricsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CTASection />
      <Footer />
    </div>
  </div>
);

export default Landing;
