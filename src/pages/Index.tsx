import { FactsDebunker } from "@/components/FactsDebunker";
import { MindBlowingFacts } from "@/components/MindBlowingFacts";
import { FAQSection } from "@/components/FAQSection";
import { EducationalResources } from "@/components/EducationalResources";
import { FloatingBackground } from "@/components/FloatingBackground";
import { Link } from "react-router-dom";
import { Sparkles, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import Footer from "@/components/Footer";
import { useLanguage } from "@/hooks/use-language";

const Index = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col relative">
      <FloatingBackground />
      <SEOHead url="https://isthatstilltrue.com/" />
      <div className="flex-1 relative z-10">
        <FactsDebunker />
        <MindBlowingFacts />

        {/* CTA Section: Bot + Quiz */}
        <section className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Fact-Checker Bot */}
            <div className="p-8 rounded-2xl border bg-card text-center">
              <div className="text-4xl mb-3">🤓</div>
              <h2 className="text-xl font-bold mb-2 text-foreground">{t("gotQuestion")}</h2>
              <p className="text-muted-foreground mb-4 text-sm">{t("gotQuestionSub")}</p>
              <Button asChild className="gap-2">
                <Link to="/ask">
                  <Sparkles className="h-4 w-4" />
                  {t("askBot")}
                </Link>
              </Button>
            </div>

            {/* Quiz CTA */}
            <div className="p-8 rounded-2xl border bg-card text-center">
              <div className="text-4xl mb-3">🧠</div>
              <h2 className="text-xl font-bold mb-2 text-foreground">{t("quizTitle")}</h2>
              <p className="text-muted-foreground mb-4 text-sm">{t("quizSubtitle")}</p>
              <Button asChild variant="outline" className="gap-2">
                <Link to="/quiz">
                  <Brain className="h-4 w-4" />
                  {t("quizStart")}
                </Link>
              </Button>
            </div>
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
