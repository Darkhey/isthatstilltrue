import { SEOHead } from "@/components/SEOHead";
import { FloatingBackground } from "@/components/FloatingBackground";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GraduationCap, Brain, Share2, Search } from "lucide-react";

const steps = [
  {
    icon: GraduationCap,
    title: "1. Enter Your Details",
    description:
      "Tell us your graduation year and country. This helps us identify exactly which curriculum and textbooks shaped your knowledge.",
  },
  {
    icon: Brain,
    title: "2. AI Research",
    description:
      "Our AI analyzes thousands of scientific papers, fact-check databases, and curriculum archives to find facts that have been debunked or updated since you graduated.",
  },
  {
    icon: Search,
    title: "3. Get Your Results",
    description:
      "See a personalized list of outdated facts you likely learned in school, complete with what science says today and sources you can verify.",
  },
  {
    icon: Share2,
    title: "4. Share & Discuss",
    description:
      "Share individual facts with friends and classmates. Compare what different generations and countries were taught differently!",
  },
];

const HowItWorks = () => {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How does Is That Still True? work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Enter your graduation year and country. Our AI compares what was taught in school curricula with the latest scientific findings to reveal outdated facts.",
        },
      },
      {
        "@type": "Question",
        name: "Is it free to use?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! Is That Still True? is completely free to use. You can check unlimited facts and share them with friends.",
        },
      },
      {
        "@type": "Question",
        name: "How accurate are the results?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We cross-reference multiple scientific sources and databases. Each debunked fact includes sources you can verify yourself.",
        },
      },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <FloatingBackground />
      <SEOHead
        title="How It Works"
        description="Learn how Is That Still True? uses AI to discover outdated school facts. Enter your graduation year, get personalized results, and share mind-blowing discoveries."
        url="https://isthatstilltrue.com/how-it-works"
        jsonLd={faqJsonLd}
      />
      <div className="flex-1 relative z-10 container mx-auto px-4 py-8 max-w-3xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
          How It Works
        </h1>
        <p className="text-lg text-muted-foreground mb-10">
          Four simple steps to discover what your school got wrong.
        </p>

        <div className="space-y-8">
          {steps.map((step) => (
            <div key={step.title} className="flex gap-5 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <step.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">{step.title}</h2>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-card rounded-xl p-6 border text-center space-y-4">
          <p className="text-lg font-medium">Ready to try it yourself?</p>
          <Link to="/">
            <Button size="lg" className="bg-gradient-primary hover:opacity-90 text-primary-foreground">
              Start Fact-Checking →
            </Button>
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default HowItWorks;
