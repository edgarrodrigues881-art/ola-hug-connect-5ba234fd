import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import MetricsSection from "@/components/landing/MetricsSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const Landing = () => (
  <div className="landing-dark min-h-screen bg-background scroll-smooth">
    <Navbar />
    <HeroSection />
    <MetricsSection />
    <FeaturesSection />
    <HowItWorksSection />
    <CTASection />
    <Footer />
  </div>
);

export default Landing;
