
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, AlertTriangle, BookOpen, Beaker, Atom, Zap, Clock, Globe, Monitor, ExternalLink, Lightbulb, GraduationCap, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FactSkeleton } from "./FactSkeleton";
import { FactShare } from "./FactShare";

interface OutdatedFact {
  category: string;
  fact: string;
  correction: string;
  yearDebunked: number;
  mindBlowingFactor: string;
  sourceUrl?: string;
  sourceName?: string;
}

interface EducationSystemProblem {
  problem: string;
  description: string;
  impact: string;
}

const countries = [
  { value: "Germany", label: "Germany" },
  { value: "USA", label: "USA" },
  { value: "Austria", label: "Austria" },
  { value: "Switzerland", label: "Switzerland" },
  { value: "France", label: "France" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "Canada", label: "Canada" },
  { value: "Australia", label: "Australia" },
  { value: "Netherlands", label: "Netherlands" },
  { value: "Sweden", label: "Sweden" },
];

const getCategoryIcon = (category: string) => {
  const iconMap: Record<string, any> = {
    "Science": Beaker,
    "Technology": Monitor,
    "Physics": Zap,
    "Medicine": Beaker,
    "Society": Globe,
    "Laws": BookOpen,
    "Culture": Clock,
    "Environment": Globe,
    "Space": Atom,
    "Astronomy": Atom,
    "Nutrition": Beaker,
    "History": BookOpen,
    "Geography": Globe,
  };
  return iconMap[category] || BookOpen;
};

export const FactsDebunker = () => {
  const [country, setCountry] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [facts, setFacts] = useState<OutdatedFact[]>([]);
  const [educationProblems, setEducationProblems] = useState<EducationSystemProblem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [showSkeletons, setShowSkeletons] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleNextStep = () => {
    if (!country) {
      setError("Please select your country.");
      return;
    }
    setError(null);
    setStep(2);
  };

  const generateFacts = async () => {
    if (!graduationYear || parseInt(graduationYear) < 1950 || parseInt(graduationYear) > new Date().getFullYear()) {
      setError("Please enter a valid graduation year between 1950 and current year.");
      return;
    }

    setIsLoading(true);
    setShowSkeletons(true);
    setFacts([]);
    setError(null);
    setSuccessMessage(null);
    
    try {
      console.log(`Generating facts for ${country} ${graduationYear}`);
      
      const { data, error } = await supabase.functions.invoke('generate-facts', {
        body: {
          country,
          graduationYear: parseInt(graduationYear)
        }
      });

      if (error) {
        throw error;
      }

      if (!data.facts || data.facts.length === 0) {
        setError("No outdated facts could be generated for this combination. Try a different country or earlier year.");
        setShowSkeletons(false);
        return;
      }

      setFacts(data.facts);
      setEducationProblems(data.educationProblems || []);
      setShowSkeletons(false);
      
      if (data.cached) {
        setSuccessMessage(`Found ${data.facts.length} facts (cached from ${data.cacheAge} days ago)`);
      } else {
        setSuccessMessage(`Successfully generated ${data.facts.length} educational facts!`);
      }
    } catch (error) {
      console.error('Error generating facts:', error);
      setError("Could not generate facts. Please try again or select a different country/year combination.");
      setShowSkeletons(false);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setCountry("");
    setGraduationYear("");
    setFacts([]);
    setEducationProblems([]);
    setShowSkeletons(false);
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-background">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <GraduationCap className="h-16 w-16 text-primary mr-4" />
            <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              School Facts Debunker
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Discover what you learned in school that has since been proven wrong. 
            Find out how knowledge has evolved since you graduated.
          </p>
        </div>

        <Card className="max-w-md mx-auto mb-8 shadow-glow">
          {step === 1 ? (
            <>
              <CardHeader>
                <CardTitle className="text-center">Step 1: Select Country</CardTitle>
                <CardDescription className="text-center">
                  Choose your country for curriculum-specific analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country..." />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {error && (
                  <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
                <Button 
                  onClick={handleNextStep}
                  className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                >
                  Next
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-center">Step 2: Enter Graduation Year</CardTitle>
                <CardDescription className="text-center">
                  {country} • We'll analyze your school curriculum from that era
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  type="number"
                  placeholder="e.g. 2010"
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  min="1950"
                  max={new Date().getFullYear()}
                  className="text-center text-lg"
                />
                {error && (
                  <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
                {successMessage && (
                  <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 p-3 rounded-md">
                    <Lightbulb className="h-4 w-4" />
                    {successMessage}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button 
                    onClick={resetForm}
                    variant="outline"
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={generateFacts}
                    disabled={isLoading}
                    className="flex-1 bg-gradient-primary hover:opacity-90 transition-opacity"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      "Analyze My Education!"
                    )}
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>

        {(showSkeletons || facts.length > 0) && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">
                {showSkeletons ? "Finding Outdated Facts..." : "What You Learned vs. What We Know Now"}
              </h2>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {country} • Graduated {graduationYear}
              </Badge>
              {!showSkeletons && facts.length > 0 && (
                <p className="text-muted-foreground mt-2">
                  {facts.length} facts from your school days that have since been updated
                </p>
              )}
            </div>

            {/* Education System Problems */}
            {!showSkeletons && educationProblems.length > 0 && (
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-4 text-center">
                  Education System Challenges in {country} around {graduationYear}
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {educationProblems.map((problem, index) => (
                    <Card key={index} className="border-orange-200 bg-orange-50/50">
                      <CardHeader>
                        <CardTitle className="text-orange-800 text-lg">
                          {problem.problem}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-sm text-orange-700">
                          {problem.description}
                        </p>
                        <div className="pt-2 border-t border-orange-200">
                          <p className="text-xs font-medium text-orange-600">
                            <strong>Impact:</strong> {problem.impact}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            <Accordion type="multiple" className="space-y-4">
              {showSkeletons ? (
                Array.from({ length: 6 }, (_, index) => (
                  <FactSkeleton key={`skeleton-${index}`} index={index} />
                ))
              ) : (
                facts.map((fact, index) => {
                  const IconComponent = getCategoryIcon(fact.category);
                  return (
                    <AccordionItem 
                      key={index} 
                      value={`item-${index}`}
                      className="border rounded-lg shadow-sm hover:shadow-md transition-shadow animate-fade-in"
                    >
                      <AccordionTrigger className="px-6 py-4 hover:no-underline">
                        <div className="flex items-center gap-4 w-full">
                          <IconComponent className="h-6 w-6 text-primary" />
                          <div className="flex-1 text-left">
                            <div className="font-semibold text-lg">{fact.category}</div>
                            <div className="text-sm text-muted-foreground truncate">
                              {fact.fact.length > 80 ? `${fact.fact.substring(0, 80)}...` : fact.fact}
                            </div>
                          </div>
                          <Badge variant="destructive" className="ml-auto">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Debunked {fact.yearDebunked}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <div className="space-y-4">
                          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                            <h4 className="font-semibold text-destructive mb-2 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4" />
                              What you were taught in {graduationYear}:
                            </h4>
                            <p className="text-sm italic">
                              „{fact.fact.replace(`In ${graduationYear}, students in ${country} were taught that`, '').replace(`In ${graduationYear}, ${country} students were taught that`, '')}"
                            </p>
                          </div>
                          
                          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                            <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                              <BookOpen className="w-4 h-4" />
                              What we know now:
                            </h4>
                            <p className="text-sm">
                              {fact.correction}
                            </p>
                          </div>

                          {fact.mindBlowingFactor && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                              <h4 className="font-semibold text-amber-700 mb-2 flex items-center gap-2">
                                <Lightbulb className="w-4 h-4" />
                                Why This Matters:
                              </h4>
                              <p className="text-sm text-amber-800">
                                {fact.mindBlowingFactor}
                              </p>
                            </div>
                          )}

                          {(fact.sourceUrl || fact.sourceName) && (
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                              <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                <ExternalLink className="w-4 h-4" />
                                Source:
                              </h4>
                              {fact.sourceUrl ? (
                                <a 
                                  href={fact.sourceUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                                >
                                  {fact.sourceName || fact.sourceUrl}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <p className="text-sm text-slate-600">{fact.sourceName}</p>
                              )}
                            </div>
                          )}

                          <FactShare 
                            fact={fact} 
                            country={country} 
                            graduationYear={graduationYear} 
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })
              )}
            </Accordion>
            
            {!showSkeletons && (
              <div className="text-center mt-8">
                <Button 
                  onClick={resetForm}
                  variant="outline"
                  className="px-8"
                >
                  Analyze Another Era
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
