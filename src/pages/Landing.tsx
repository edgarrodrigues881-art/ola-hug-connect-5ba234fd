import { useEffect } from "react";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import TrustSection from "@/components/landing/TrustSection";
import PlansSection from "@/components/landing/PlansSection";
import Footer from "@/components/landing/Footer";
import LandingBackground from "@/components/landing/LandingBackground";
import SocialProofToast from "@/components/landing/SocialProofToast";


// Prefetch Auth and MyPlan chunks on idle
const prefetchRoutes = () => {
  const load = () => {
    import("../pages/Auth");
    import("../pages/dashboard/MyPlan");
  };
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    (window as any).requestIdleCallback(load);
  } else {
    setTimeout(load, 2000);
  }
};

const Landing = () => {
  useEffect(() => { prefetchRoutes(); }, []);

  return (
    <div className="landing-dark min-h-screen bg-[#0B0F14] relative" style={{ overflowX: "hidden" }}>
      <LandingBackground />

      <div className="relative z-10">
        <Navbar />
        <HeroSection />
        <HowItWorksSection />
        <TrustSection />
        <PlansSection />
        <Footer />
      </div>

      <SocialProofToast />
      
    </div>
  );
};

export default Landing;
