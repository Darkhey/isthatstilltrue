import { FactsDebunker } from "@/components/FactsDebunker";
import { Navigation } from "@/components/Navigation";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <div className="flex-1">
        <FactsDebunker />
      </div>
      <Footer />
    </div>
  );
};

export default Index;
