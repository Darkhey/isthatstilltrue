import { SchoolFactChat } from "@/components/SchoolFactChat";
import { SEOHead } from "@/components/SEOHead";
import { FloatingBackground } from "@/components/FloatingBackground";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const AskBot = () => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Is That Still True? Fact-Checker Bot",
    description: "Ask our AI bot whether what you learned in school is still true.",
    url: "https://isthatstilltrue.com/ask",
    applicationCategory: "EducationalApplication",
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <FloatingBackground />
      <SEOHead
        title="Fact-Checker Bot"
        description="Ask our AI bot whether what you learned in school is still true. Get instant, sourced answers!"
        url="https://isthatstilltrue.com/ask"
        jsonLd={jsonLd}
      />
      <div className="flex-1 relative z-10 container mx-auto px-4 py-8 max-w-2xl">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
        <h1 className="text-3xl font-bold mb-2 text-foreground">🤓 Fact-Checker Bot</h1>
        <p className="text-muted-foreground mb-6">
          Frag den Bot alles, was du in der Schule gelernt hast – er checkt ob's noch stimmt!
        </p>
        <SchoolFactChat />
      </div>
      <Footer />
    </div>
  );
};

export default AskBot;
