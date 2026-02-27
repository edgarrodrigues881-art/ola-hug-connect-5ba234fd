import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import MetricsSection from "@/components/landing/MetricsSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";
import GalacticParticles from "@/components/landing/GalacticParticles";

const Landing = () => (
  <div className="min-h-screen bg-background scroll-smooth relative overflow-hidden">
    <div className="fixed inset-0 pointer-events-none z-0">
      <GalacticParticles />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 20% 50%, hsl(142 76% 36% / 0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, hsl(158 64% 51% / 0.06) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, hsl(142 71% 45% / 0.05) 0%, transparent 50%)",
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
