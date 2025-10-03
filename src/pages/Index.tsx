import { FactsDebunker } from "@/components/FactsDebunker";
import { FAQSection } from "@/components/FAQSection";
import { EducationalResources } from "@/components/EducationalResources";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <FactsDebunker />
        <FAQSection />
        <EducationalResources />
      </div>
      <Footer />
    </div>
  );
};
export default Index;
