import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import MetricsSection from "@/components/landing/MetricsSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";
import GalacticParticles from "@/components/landing/GalacticParticles";

const Landing = () => (
  <div className="landing-dark min-h-screen bg-background scroll-smooth relative overflow-hidden">
    <div className="fixed inset-0 pointer-events-none z-0">
      <GalacticParticles />
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 90% 70% at 15% 5%, hsl(142 70% 35% / 0.45) 0%, transparent 55%),
            radial-gradient(ellipse 70% 60% at 85% 15%, hsl(160 80% 30% / 0.35) 0%, transparent 50%),
            radial-gradient(ellipse 80% 60% at 50% 50%, hsl(130 60% 25% / 0.3) 0%, transparent 55%),
            radial-gradient(ellipse 60% 50% at 90% 75%, hsl(170 70% 30% / 0.25) 0%, transparent 50%),
            radial-gradient(ellipse 50% 40% at 5% 85%, hsl(150 60% 28% / 0.2) 0%, transparent 45%),
            radial-gradient(ellipse 100% 80% at 50% 30%, hsl(140 50% 15% / 0.45) 0%, transparent 70%)
          `,
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
