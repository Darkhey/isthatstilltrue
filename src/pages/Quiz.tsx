import { QuizMode } from "@/components/QuizMode";
import { SEOHead } from "@/components/SEOHead";
import Footer from "@/components/Footer";
import { FloatingBackground } from "@/components/FloatingBackground";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Quiz = () => {
  return (
    <div className="min-h-screen flex flex-col relative">
      <FloatingBackground />
      <SEOHead
        title="Quiz – Is That Still True?"
        description="Test your school knowledge! 10 facts you learned in school – do you know which ones are still true?"
        url="https://isthatstilltrue.com/quiz"
      />
      <div className="flex-1 relative z-10">
        <div className="container mx-auto px-4 py-6">
          <Button variant="ghost" size="sm" asChild className="mb-6 gap-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="max-w-2xl mx-auto">
            <QuizMode />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Quiz;
