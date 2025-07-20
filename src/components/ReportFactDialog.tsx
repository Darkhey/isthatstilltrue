import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Flag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ReportFactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fact: {
    category: string;
    fact: string;
    correction: string;
    yearDebunked: number;
    mindBlowingFactor: string;
    sourceUrl?: string;
    sourceName?: string;
  };
  country: string;
  graduationYear: number;
}

const reportReasons = [
  { value: "incorrect", label: "Factually incorrect", description: "The fact or correction is not accurate" },
  { value: "misleading", label: "Misleading", description: "The fact is confusing or misleadingly presented" },
  { value: "outdated", label: "Outdated", description: "The information is no longer current" },
  { value: "source", label: "Poor source", description: "The cited source is unreliable" },
  { value: "other", label: "Other", description: "Another issue" }
];

export function ReportFactDialog({ open, onOpenChange, fact, country, graduationYear }: ReportFactDialogProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const generateFactHash = (fact: ReportFactDialogProps["fact"]) => {
    const factString = `${fact.category}|${fact.fact}|${fact.correction}`;
    return btoa(factString).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast({
        title: "Please select a reason",
        description: "Choose a reason for reporting this fact.",
        variant: "destructive",
      });
      return;
    }

    if (selectedReason === "other" && !customReason.trim()) {
      toast({
        title: "Please provide a description",
        description: "A description is required when selecting 'Other'.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const factHash = generateFactHash(fact);
      const reasonText = selectedReason === "other" ? customReason : reportReasons.find(r => r.value === selectedReason)?.label || selectedReason;
      
      // Generate anonymous user fingerprint (simple browser-based)
      const userFingerprint = btoa(`${navigator.userAgent}|${screen.width}x${screen.height}|${Intl.DateTimeFormat().resolvedOptions().timeZone}`).substring(0, 20);

      const { error } = await supabase
        .from('fact_reports')
        .insert({
          fact_hash: factHash,
          country,
          graduation_year: graduationYear,
          fact_content: fact.fact,
          report_reason: reasonText,
          user_fingerprint: userFingerprint
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Fact reported",
        description: "Thank you for your report. We will review this fact.",
      });

      onOpenChange(false);
      setSelectedReason("");
      setCustomReason("");
    } catch (error) {
      console.error('Error reporting fact:', error);
      toast({
        title: "Error reporting fact",
        description: "There was a problem submitting your report. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Report Fact
          </DialogTitle>
          <DialogDescription>
            Help us improve the quality of facts. Report any issues with this fact.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium text-muted-foreground mb-1">Reported Fact:</p>
              <p className="text-sm break-words">{fact.fact}</p>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-medium">What's the problem?</Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              {reportReasons.map((reason) => (
                <div key={reason.value} className="flex items-start space-x-2">
                  <RadioGroupItem value={reason.value} id={reason.value} className="mt-1" />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor={reason.value}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {reason.label}
                    </Label>
                    <p className="text-xs text-muted-foreground break-words">
                      {reason.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {selectedReason === "other" && (
            <div className="space-y-2">
              <Label htmlFor="custom-reason">Problem Description</Label>
              <Textarea
                id="custom-reason"
                placeholder="Describe the problem with this fact..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-200 break-words">
              Facts with more than 5 reports are automatically flagged for review and may be replaced.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedReason || isSubmitting}>
            {isSubmitting ? "Reporting..." : "Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}