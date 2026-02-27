import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import DashboardPreview from "@/components/landing/DashboardPreview";
import TrustSection from "@/components/landing/TrustSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const Landing = () => (
  <div className="min-h-screen bg-[#0B0F14] scroll-smooth relative overflow-hidden">
    {/* Ambient glow background — spread across the whole page */}
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Top center */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-50"
        style={{
          top: "-10%",
          left: "50%",
          transform: "translateX(-50%)",
          background: "radial-gradient(circle, rgba(7,193,96,0.06) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      {/* Middle left */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-40"
        style={{
          top: "30%",
          left: "-5%",
          background: "radial-gradient(circle, rgba(7,193,96,0.05) 0%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />
      {/* Middle right */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-40"
        style={{
          top: "50%",
          right: "-5%",
          background: "radial-gradient(circle, rgba(7,193,96,0.05) 0%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />
      {/* Bottom center */}
      <div
        className="absolute w-[700px] h-[500px] rounded-full opacity-30"
        style={{
          bottom: "-5%",
          left: "50%",
          transform: "translateX(-50%)",
          background: "radial-gradient(ellipse, rgba(7,193,96,0.06) 0%, transparent 65%)",
          filter: "blur(100px)",
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
