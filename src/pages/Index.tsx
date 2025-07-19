import { FactsDebunker } from "@/components/FactsDebunker";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <FactsDebunker />
      </div>
      <Footer />
    </div>
  );
};

export default Index;
