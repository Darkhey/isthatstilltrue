import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, AlertTriangle, BookOpen, Beaker, Atom, Zap, Clock, Globe, Monitor, ExternalLink, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface OutdatedFact {
  category: string;
  fact: string;
  correction: string;
  yearDebunked: number;
  mindBlowingFactor: string;
  sourceUrl?: string;
  sourceName?: string;
}

const countries = [
  { value: "Germany", label: "Germany" },
  { value: "USA", label: "USA" },
  { value: "Austria", label: "Austria" },
  { value: "Switzerland", label: "Switzerland" },
  { value: "France", label: "France" },
  { value: "United Kingdom", label: "United Kingdom" },
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
  };
  return iconMap[category] || BookOpen;
};

export const FactsDebunker = () => {
  const [country, setCountry] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [facts, setFacts] = useState<OutdatedFact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const { toast } = useToast();

  const handleNextStep = () => {
    if (!country) {
      toast({
        title: "Select Country",
        description: "Please select your country.",
        variant: "destructive",
      });
      return;
    }
    setStep(2);
  };

  const generateFacts = async () => {
    if (!graduationYear || parseInt(graduationYear) < 1950 || parseInt(graduationYear) > new Date().getFullYear()) {
      toast({
        title: "Invalid Year",
        description: "Please enter a valid graduation year between 1950 and current year.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-facts', {
        body: {
          country,
          graduationYear: parseInt(graduationYear)
        }
      });

      if (error) {
        throw error;
      }

      setFacts(data.facts || []);
      
      toast({
        title: "Facts Generated!",
        description: `Found ${data.facts?.length || 0} outdated facts from your school days.`,
      });
    } catch (error) {
      console.error('Error generating facts:', error);
      toast({
        title: "Error",
        description: "Could not generate facts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setCountry("");
    setGraduationYear("");
    setFacts([]);
  };

  return (
    <div className="min-h-screen bg-gradient-background">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <BookOpen className="h-16 w-16 text-primary mr-4" />
            <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              School Facts Debunker
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover what "facts" you learned in school that have since been proven wrong. 
            AI-powered analysis based on your education system and graduation year!
          </p>
        </div>

        <Card className="max-w-md mx-auto mb-8 shadow-glow">
          {step === 1 ? (
            <>
              <CardHeader>
                <CardTitle className="text-center">Step 1: Select Country</CardTitle>
                <CardDescription className="text-center">
                  Choose your country for curriculum-specific content
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
                  {country} • We'll find outdated facts from your school days
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
                        Generating...
                      </>
                    ) : (
                      "Generate Facts!"
                    )}
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>

        {facts.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">
                Outdated Facts from Your School Days
              </h2>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {country} • Graduated {graduationYear}
              </Badge>
            </div>
            
            <Accordion type="multiple" className="space-y-4">
              {facts.map((fact, index) => {
                const IconComponent = getCategoryIcon(fact.category);
                return (
                  <AccordionItem 
                    key={index} 
                    value={`item-${index}`}
                    className="border rounded-lg shadow-sm hover:shadow-md transition-shadow"
                  >
                    <AccordionTrigger className="px-6 py-4 hover:no-underline">
                      <div className="flex items-center gap-4 w-full">
                        <IconComponent className="h-6 w-6 text-primary" />
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-lg">{fact.category}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {fact.fact.length > 60 ? `${fact.fact.substring(0, 60)}...` : fact.fact}
                          </div>
                        </div>
                        <Badge variant="destructive" className="ml-auto">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {fact.yearDebunked}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                      <div className="space-y-4">
                        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                          <h4 className="font-semibold text-destructive mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            What you were taught:
                          </h4>
                          <p className="text-sm italic">
                            „{fact.fact}"
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
                              Mind-Blowing Factor:
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
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
            
            <div className="text-center mt-8">
              <Button 
                onClick={resetForm}
                variant="outline"
                className="px-8"
              >
                Start New Search
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};