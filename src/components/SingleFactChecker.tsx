import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, AlertCircle, Lightbulb, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FactCheckResult {
  isStillValid: boolean;
  originalStatement: string;
  correction?: string;
  yearDebunked?: number;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
  sources?: string[];
}

export const SingleFactChecker = () => {
  const [statement, setStatement] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<FactCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const checkFact = async () => {
    if (!statement.trim()) {
      toast({
        title: "Error",
        description: "Please enter a statement to check.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('check-single-fact', {
        body: { statement: statement.trim() }
      });

      if (functionError) {
        throw functionError;
      }

      setResult(data);
      
      if (!data.isStillValid) {
        toast({
          title: "Fact Check Complete",
          description: "This statement appears to be outdated. Check the results below.",
        });
      } else {
        toast({
          title: "Fact Check Complete",
          description: "This statement appears to still be accurate.",
        });
      }

    } catch (error) {
      console.error('Error checking fact:', error);
      setError("Could not check this fact. Please try again.");
      toast({
        title: "Error",
        description: "Failed to check the fact. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (isValid: boolean) => {
    return isValid ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="shadow-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Single Fact Checker
          </CardTitle>
          <CardDescription>
            Enter something you learned in school to check if it's still accurate today
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="statement" className="text-sm font-medium">
              I have learned that...
            </label>
            <Textarea
              id="statement"
              placeholder="e.g., The atom is the smallest unit of matter"
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              className="min-h-20 resize-none"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <Button 
            onClick={checkFact}
            disabled={isLoading || !statement.trim()}
            className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking Fact...
              </>
            ) : (
              "Check This Fact"
            )}
          </Button>

          {result && (
            <div className="mt-6 space-y-4 animate-fade-in">
              <div className="flex items-start gap-3 p-4 bg-background/50 rounded-lg border">
                {getStatusIcon(result.isStillValid)}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">
                    {result.isStillValid ? "Still Accurate ✓" : "Outdated Information ✗"}
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Original Statement:</span>
                      <p className="text-sm italic mt-1 p-2 bg-muted/50 rounded">
                        "{result.originalStatement}"
                      </p>
                    </div>

                    {!result.isStillValid && result.correction && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Correct Information:</span>
                        <p className="text-sm mt-1 p-2 bg-green-50 dark:bg-green-950/30 rounded border border-green-200 dark:border-green-800">
                          {result.correction}
                        </p>
                      </div>
                    )}

                    {result.yearDebunked && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Debunked Around:</span>
                        <Badge variant="destructive" className="text-xs">
                          {result.yearDebunked}
                        </Badge>
                      </div>
                    )}

                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Explanation:</span>
                      <p className="text-sm mt-1 text-muted-foreground leading-relaxed">
                        {result.explanation}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Confidence:</span>
                        <Badge className={getConfidenceColor(result.confidence)}>
                          {result.confidence}
                        </Badge>
                      </div>

                      {result.sources && result.sources.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ExternalLink className="h-3 w-3" />
                          Sources available
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};