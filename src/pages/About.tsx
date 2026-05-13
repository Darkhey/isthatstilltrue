import { SEOHead } from "@/components/SEOHead";
import { FloatingBackground } from "@/components/FloatingBackground";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Target, Users, Sparkles } from "lucide-react";

const About = () => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About Is That Still True?",
    description: "Learn about our mission to uncover outdated school knowledge and replace it with modern scientific facts.",
    url: "https://isthatstilltrue.com/about",
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <FloatingBackground />
      <SEOHead
        title="About Us"
        description="Our mission: uncover outdated school knowledge and replace it with modern scientific facts you can verify."
        url="https://isthatstilltrue.com/about"
        jsonLd={jsonLd}
      />
      <div className="flex-1 relative z-10 container mx-auto px-4 py-8 max-w-3xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-8 bg-gradient-primary bg-clip-text text-transparent">
          About Is That Still True?
        </h1>

        <div className="space-y-8 text-foreground">
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-primary flex-shrink-0" />
              <h2 className="text-2xl font-semibold">Our Mission</h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Science never stops. But textbooks do. Every year, new discoveries overturn things we were taught as absolute truth in school. <strong>Is That Still True?</strong> bridges the gap between what you learned and what we know now.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We use AI-powered research to identify outdated facts from school curricula worldwide, cross-reference them with the latest scientific findings, and present the truth in a fun, shareable format.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <BookOpen className="h-6 w-6 text-primary flex-shrink-0" />
              <h2 className="text-2xl font-semibold">Why This Matters</h2>
            </div>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <Sparkles className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                <span><strong>Pluto isn't a planet anymore</strong> — reclassified in 2006, yet millions still "know" it as the 9th planet.</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                <span><strong>Taste zones on the tongue are a myth</strong> — debunked decades ago, still taught in some schools.</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                <span><strong>Brontosaurus is back</strong> — after being "cancelled" for over a century, it was re-validated in 2015.</span>
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-primary flex-shrink-0" />
              <h2 className="text-2xl font-semibold">Who We Are</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Built by curious minds who believe learning shouldn't stop at graduation. We're a small team passionate about education, science communication, and making knowledge accessible and entertaining.
            </p>
          </section>

          <div className="bg-card rounded-xl p-6 border text-center space-y-4">
            <p className="text-lg font-medium">Ready to find out what your school got wrong?</p>
            <Link to="/">
              <Button size="lg" className="bg-gradient-primary hover:opacity-90 text-primary-foreground">
                Check Your School Facts →
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default About;
