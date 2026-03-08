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

        {/* Fact-Checker Bot CTA */}
        <section className="container mx-auto px-4 py-12 text-center">
          <div className="max-w-xl mx-auto p-8 rounded-2xl border bg-card">
            <div className="text-4xl mb-3">🤓</div>
            <h2 className="text-2xl font-bold mb-2 text-foreground">Got a question about school facts?</h2>
            <p className="text-muted-foreground mb-4">
              Ask our AI Fact-Checker Bot if what you learned is still true!
            </p>
            <Button asChild size="lg" className="gap-2">
              <Link to="/ask">
                <Sparkles className="h-4 w-4" />
                Ask the Bot
              </Link>
            </Button>
          </div>
        </section>

        <FAQSection />
        <EducationalResources />
      </div>
      <Footer />
    </div>
  );
};
export default Index;
