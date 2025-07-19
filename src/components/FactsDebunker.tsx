import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OutdatedFact {
  category: string;
  fact: string;
  correction: string;
  yearDebunked: number;
}

export const FactsDebunker = () => {
  const [graduationYear, setGraduationYear] = useState("");
  const [facts, setFacts] = useState<OutdatedFact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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
    
    // Simulate AI generation with sample data for now
    // In a real implementation, this would call an AI API
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const sampleFacts: OutdatedFact[] = [
      {
        category: "Astronomy",
        fact: "Pluto is the 9th planet in our solar system",
        correction: "Pluto was reclassified as a dwarf planet in 2006 by the International Astronomical Union",
        yearDebunked: 2006
      },
      {
        category: "Biology",
        fact: "Humans only use 10% of their brains",
        correction: "Modern brain imaging shows humans use virtually all of their brain, even during simple tasks",
        yearDebunked: 1990
      },
      {
        category: "Physics",
        fact: "Different areas of the tongue taste different flavors",
        correction: "The tongue map theory was debunked - all taste buds can detect all basic tastes",
        yearDebunked: 1974
      },
      {
        category: "History",
        fact: "Christopher Columbus discovered America",
        correction: "Indigenous peoples lived in the Americas for thousands of years before Columbus, and Vikings reached North America centuries earlier",
        yearDebunked: 1960
      },
      {
        category: "Biology",
        fact: "Dinosaurs were cold-blooded reptiles",
        correction: "Evidence suggests many dinosaurs were warm-blooded or had mixed metabolisms",
        yearDebunked: 1980
      }
    ];

    const relevantFacts = sampleFacts.filter(fact => 
      fact.yearDebunked > parseInt(graduationYear)
    );

    setFacts(relevantFacts);
    setIsLoading(false);

    toast({
      title: "Facts Generated!",
      description: `Found ${relevantFacts.length} outdated facts from your school days.`,
    });
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
            Enter your graduation year and let AI reveal how knowledge has evolved!
          </p>
        </div>

        <Card className="max-w-md mx-auto mb-8 shadow-glow">
          <CardHeader>
            <CardTitle className="text-center">Enter Your Graduation Year</CardTitle>
            <CardDescription className="text-center">
              We'll find outdated facts taught before this year
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="number"
              placeholder="e.g., 2010"
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value)}
              min="1950"
              max={new Date().getFullYear()}
              className="text-center text-lg"
            />
            <Button 
              onClick={generateFacts}
              disabled={isLoading}
              className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Facts...
                </>
              ) : (
                "Debunk My Education!"
              )}
            </Button>
          </CardContent>
        </Card>

        {facts.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">
              Outdated Facts from Your School Days
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {facts.map((fact, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{fact.category}</Badge>
                      <Badge variant="destructive">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Debunked {fact.yearDebunked}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-destructive mb-2">
                          What you were taught:
                        </h4>
                        <p className="text-sm text-muted-foreground italic">
                          "{fact.fact}"
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-primary mb-2">
                          What we know now:
                        </h4>
                        <p className="text-sm">
                          {fact.correction}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};