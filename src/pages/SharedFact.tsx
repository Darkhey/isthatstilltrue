import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/SEOHead";
import { FactShare } from "@/components/FactShare";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, AlertTriangle, CheckCircle, Sparkles } from "lucide-react";
import { FloatingBackground } from "@/components/FloatingBackground";
import Footer from "@/components/Footer";

interface OutdatedFact {
  category: string;
  fact: string;
  correction: string;
  yearDebunked: number;
  mindBlowingFactor: string;
  sourceUrl?: string;
  sourceName?: string;
}

const SharedFact = () => {
  const { slug } = useParams<{ slug: string }>();
  const [fact, setFact] = useState<OutdatedFact | null>(null);
  const [country, setCountry] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchFact = async () => {
      if (!slug) return;
      const { data, error: err } = await supabase
        .from("shared_facts" as any)
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (err || !data) {
        setError(true);
      } else {
        const d = data as any;
        const fd = d.fact_data as OutdatedFact;
        setFact(fd);
        setCountry(d.country);
        setGraduationYear(String(d.graduation_year));
      }
      setLoading(false);
    };
    fetchFact();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !fact) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-bold">Fact not found</h1>
        <p className="text-muted-foreground">This shared fact doesn't exist or has been removed.</p>
        <Link to="/">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" /> Discover More Facts
          </Button>
        </Link>
      </div>
    );
  }

  const claimReviewJsonLd = {
    "@context": "https://schema.org",
    "@type": "ClaimReview",
    url: `https://isthatstilltrue.com/fact/${slug}`,
    claimReviewed: fact.fact,
    author: { "@type": "Organization", name: "Is That Still True" },
    reviewRating: {
      "@type": "Rating",
      ratingValue: 1,
      bestRating: 5,
      worstRating: 1,
      alternateName: "Outdated",
    },
    itemReviewed: {
      "@type": "Claim",
      name: fact.fact,
      datePublished: String(fact.yearDebunked),
    },
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <FloatingBackground />
      <SEOHead
        title={`Debunked: ${fact.fact.substring(0, 50)}...`}
        description={`School taught: "${fact.fact}" — Debunked in ${fact.yearDebunked}! Actually: ${fact.correction}`}
        url={`https://isthatstilltrue.com/fact/${slug}`}
        jsonLd={claimReviewJsonLd}
      />
      <div className="flex-1 relative z-10 container mx-auto px-4 py-8 max-w-2xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </Button>
        </Link>

        <Card className="overflow-hidden">
          <div className="bg-gradient-primary p-6 text-primary-foreground">
            <div className="flex items-center gap-2 text-sm opacity-80 mb-2">
              <Sparkles className="h-4 w-4" />
              {fact.category} • Debunked {fact.yearDebunked}
            </div>
            <h1 className="text-xl md:text-2xl font-bold">
              🤯 School Taught You Wrong!
            </h1>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> What school taught:
              </p>
              <p className="text-lg font-medium italic">"{fact.fact}"</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> What's actually true:
              </p>
              <p className="text-lg">{fact.correction}</p>
            </div>

            {fact.mindBlowingFactor && (
              <div className="bg-accent/10 rounded-lg p-4">
                <p className="text-sm font-medium text-accent mb-1">🤯 Mind-Blowing Factor</p>
                <p className="text-sm">{fact.mindBlowingFactor}</p>
              </div>
            )}

            {fact.sourceUrl && (
              <a
                href={fact.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Source: {fact.sourceName || fact.sourceUrl}
              </a>
            )}

            <FactShare fact={fact} country={country} graduationYear={graduationYear} />

            <div className="pt-4 border-t text-center">
              <p className="text-muted-foreground mb-4">
                Discover more outdated facts from YOUR school years!
              </p>
              <Link to="/">
                <Button size="lg" className="bg-gradient-primary hover:opacity-90 text-primary-foreground">
                  Check Your School Knowledge →
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default SharedFact;
