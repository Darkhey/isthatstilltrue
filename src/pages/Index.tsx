import { FactsDebunker } from "@/components/FactsDebunker";
import { MindBlowingFacts } from "@/components/MindBlowingFacts";
import { FAQSection } from "@/components/FAQSection";
import { EducationalResources } from "@/components/EducationalResources";
import { FloatingBackground } from "@/components/FloatingBackground";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col relative">
      <FloatingBackground />
      <SEOHead url="https://isthatstilltrue.com/" />
      <div className="flex-1 relative z-10">
        <FactsDebunker />
        <MindBlowingFacts />
        <FAQSection />
        <EducationalResources />
      </div>
      <Footer />
    </div>
  );
};
export default Index;
