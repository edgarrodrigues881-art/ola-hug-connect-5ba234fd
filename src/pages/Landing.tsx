import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import MetricsSection from "@/components/landing/MetricsSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";
import GalacticParticles from "@/components/landing/GalacticParticles";

const Landing = () => (
  <div className="min-h-screen bg-black scroll-smooth relative overflow-hidden">
    <div className="fixed inset-0 pointer-events-none z-0">
      <GalacticParticles />
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
