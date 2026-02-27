import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import DashboardPreview from "@/components/landing/DashboardPreview";
import TrustSection from "@/components/landing/TrustSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const Landing = () => (
  <div className="min-h-screen bg-[#0D0D0D] scroll-smooth relative overflow-hidden">
    {/* Subtle green glow */}
    <div className="fixed inset-0 pointer-events-none z-0">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(7,193,96,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(7,193,96,0.04) 0%, transparent 50%)",
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
