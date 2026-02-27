import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import DashboardPreview from "@/components/landing/DashboardPreview";
import TrustSection from "@/components/landing/TrustSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";
import LandingBackground from "@/components/landing/LandingBackground";
import SupportButton from "@/components/SupportButton";

const Landing = () => (
  <div className="landing-dark min-h-screen bg-[#0B0F14] scroll-smooth relative overflow-hidden" style={{ isolation: "isolate" }}>
    <LandingBackground />

    <div className="relative z-10">
      <Navbar />
      <HeroSection />
      <HowItWorksSection />
      <DashboardPreview />
      <TrustSection />
      <CTASection />
      <Footer />
    </div>

    <SupportButton />
  </div>
);

export default Landing;
