import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const Landing = () => (
  <div className="min-h-screen bg-background">
    <HeroSection />
    <FeaturesSection />
    <HowItWorksSection />
    <CTASection />
    <Footer />
  </div>
);

export default Landing;
