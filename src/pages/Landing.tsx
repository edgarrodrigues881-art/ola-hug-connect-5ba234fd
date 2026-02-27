import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import DashboardPreview from "@/components/landing/DashboardPreview";
import TrustSection from "@/components/landing/TrustSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const Landing = () => (
  <div className="min-h-screen bg-[#0B0F14] scroll-smooth relative overflow-hidden">
    {/* Subtle radial gradient center */}
    <div className="fixed inset-0 pointer-events-none z-0">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(7,193,96,0.04) 0%, transparent 60%)",
        }}
      />
    </div>

    <div className="relative z-10">
      <Navbar />
      <HeroSection />
      <HowItWorksSection />
      <DashboardPreview />
      <TrustSection />
      <CTASection />
      <Footer />
    </div>
  </div>
);

export default Landing;
