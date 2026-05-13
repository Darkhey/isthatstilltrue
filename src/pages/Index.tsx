import { FactsDebunker } from "@/components/FactsDebunker";
import { MindBlowingFacts } from "@/components/MindBlowingFacts";
import { FAQSection } from "@/components/FAQSection";
import { EducationalResources } from "@/components/EducationalResources";
import { FloatingBackground } from "@/components/FloatingBackground";
import { Link } from "react-router-dom";
import { Sparkles, Brain, Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import Footer from "@/components/Footer";
import { useLanguage } from "@/hooks/use-language";

const FAQ_ITEMS: { q: string; a: string }[] = [
  { q: "What is 'Is That Still True?' and how does it work?", a: "Is That Still True? reveals how scientific understanding and commonly taught facts have evolved. Select your graduation year and country to discover what was taught as fact that has since been updated, with verifiable sources." },
  { q: "Why do facts change over time?", a: "Scientific knowledge evolves as new methods, technology, and data emerge. What seemed established decades ago may be revised as understanding deepens." },
  { q: "Are the facts on this website accurate and verified?", a: "Yes. Every fact links to reputable sources including Wikipedia, Encyclopedia Britannica, .edu and .gov domains, JSTOR, Nature, and Google Scholar." },
  { q: "Can I use this for educational purposes?", a: "Absolutely. It's a great resource for demonstrating the scientific method, critical thinking, and how knowledge evolves." },
  { q: "How far back in history can I explore?", a: "You can explore historical perspectives dating back to year 1 CE." },
];

const Index = () => {
  const { t } = useLanguage();

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <FloatingBackground />
      <SEOHead url="https://isthatstilltrue.com/" jsonLd={faqJsonLd} />
      <main className="flex-1 relative z-10">
        <FactsDebunker />

        {/* CTA Section: Bot + Quiz + Surprise — placed before MindBlowingFacts so mobile users see them immediately */}
        <section className="container mx-auto px-4 py-8 md:py-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Surprise me CTA */}
            <div className="p-8 rounded-2xl border bg-card text-center">
              <div className="text-4xl mb-3">🎲</div>
              <h2 className="text-xl font-bold mb-2 text-foreground">{t("surpriseMe")}</h2>
              <p className="text-muted-foreground mb-4 text-sm">{t("surpriseMeSub")}</p>
              <Button asChild variant="secondary" className="gap-2">
                <Link to="/?surprise=1">
                  <Dices className="h-4 w-4" />
                  {t("surpriseMe")}
                </Link>
              </Button>
            </div>

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

        <MindBlowingFacts />

        <FAQSection />
        <EducationalResources />
      </main>
      <Footer />
    </div>
  );
};
export default Index;
