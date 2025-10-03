import { FactsDebunker } from "@/components/FactsDebunker";
import { FAQSection } from "@/components/FAQSection";
import { EducationalResources } from "@/components/EducationalResources";
import { FloatingBackground } from "@/components/FloatingBackground";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col relative">
      <FloatingBackground />
      <div className="flex-1 relative z-10">
        <FactsDebunker />
        <FAQSection />
        <EducationalResources />
      </div>
      <Footer />
    </div>
  );
};
export default Index;
