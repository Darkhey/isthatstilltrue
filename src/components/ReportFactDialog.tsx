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
  { value: "incorrect", label: "Faktisch falsch", description: "Der Fakt oder die Korrektur sind nicht korrekt" },
  { value: "misleading", label: "Irreführend", description: "Der Fakt ist verwirrend oder missverständlich dargestellt" },
  { value: "outdated", label: "Veraltet", description: "Die Information ist nicht mehr aktuell" },
  { value: "source", label: "Schlechte Quelle", description: "Die angegebene Quelle ist unzuverlässig" },
  { value: "other", label: "Sonstiges", description: "Ein anderes Problem" }
];

export function ReportFactDialog({ open, onOpenChange, fact, country, graduationYear }: ReportFactDialogProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const generateFactHash = (fact: any) => {
    const factString = `${fact.category}|${fact.fact}|${fact.correction}`;
    return btoa(factString).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast({
        title: "Bitte wählen Sie einen Grund",
        description: "Wählen Sie einen Grund für die Meldung aus.",
        variant: "destructive",
      });
      return;
    }

    if (selectedReason === "other" && !customReason.trim()) {
      toast({
        title: "Bitte geben Sie eine Beschreibung an",
        description: "Bei 'Sonstiges' ist eine Beschreibung erforderlich.",
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
        title: "Fakt gemeldet",
        description: "Vielen Dank für Ihre Meldung. Wir werden den Fakt überprüfen.",
      });

      onOpenChange(false);
      setSelectedReason("");
      setCustomReason("");
    } catch (error) {
      console.error('Error reporting fact:', error);
      toast({
        title: "Fehler beim Melden",
        description: "Es gab ein Problem beim Übermitteln Ihrer Meldung. Bitte versuchen Sie es später erneut.",
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
            Fakt melden
          </DialogTitle>
          <DialogDescription>
            Helfen Sie uns dabei, die Qualität der Fakten zu verbessern. Melden Sie Probleme mit diesem Fakt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium text-muted-foreground mb-1">Gemeldeter Fakt:</p>
            <p className="text-sm">{fact.fact}</p>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-medium">Was ist das Problem?</Label>
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
                    <p className="text-xs text-muted-foreground">
                      {reason.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {selectedReason === "other" && (
            <div className="space-y-2">
              <Label htmlFor="custom-reason">Beschreibung des Problems</Label>
              <Textarea
                id="custom-reason"
                placeholder="Beschreiben Sie das Problem mit diesem Fakt..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Fakten mit mehr als 5 Meldungen werden automatisch zur Überprüfung markiert und gegebenenfalls ersetzt.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedReason || isSubmitting}>
            {isSubmitting ? "Wird gemeldet..." : "Melden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}