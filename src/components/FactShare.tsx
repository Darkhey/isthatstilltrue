import { Share2, MessageCircle, Linkedin, Facebook, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface OutdatedFact {
  category: string;
  fact: string;
  correction: string;
  yearDebunked: number;
  mindBlowingFactor: string;
  sourceUrl?: string;
  sourceName?: string;
}

interface FactShareProps {
  fact: OutdatedFact;
  country: string;
  graduationYear: string;
}

export const FactShare = ({ fact, country, graduationYear }: FactShareProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateShareText = () => {
    const maxFactLength = 120;
    const maxCorrectionLength = 100;
    
    const shortFact = fact.fact.length > maxFactLength ? fact.fact.substring(0, maxFactLength) + "..." : fact.fact;
    const shortCorrection = fact.correction.length > maxCorrectionLength ? fact.correction.substring(0, maxCorrectionLength) + "..." : fact.correction;
    
    return `🤯 SCHOOL TAUGHT ME: "${shortFact}"

❌ DEBUNKED in ${fact.yearDebunked}!

✅ ACTUALLY: ${shortCorrection}

Mind = blown! What other school "facts" are complete BS? 

Find out: https://isthatstilltrue.com

#FactCheck #Education #Science #SchoolLies #DidYouKnow #Learning`;
  };

  const generateShortShareText = () => {
    const shortFact = fact.fact.length > 60 ? fact.fact.substring(0, 60) + "..." : fact.fact;
    return `🤯 SCHOOL: "${shortFact}" ❌ DEBUNKED ${fact.yearDebunked}! Check isthatstilltrue.com for more school lies! #FactCheck #Education`;
  };

  const shareUrl = "https://isthatstilltrue.com";
  const shareText = generateShareText();
  const shortShareText = generateShortShareText();

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shortShareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
  };

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shortShareText)}`;
    window.open(facebookUrl, '_blank', 'width=550,height=420');
  };

  const handleLinkedInShare = () => {
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&summary=${encodeURIComponent(shortShareText)}`;
    window.open(linkedinUrl, '_blank', 'width=550,height=420');
  };

  const handleRedditShare = () => {
    const redditTitle = `🤯 School taught me this about ${fact.category.toLowerCase()} - turns out it was completely wrong!`;
    const redditUrl = `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(redditTitle)}&text=${encodeURIComponent(shareText)}`;
    window.open(redditUrl, '_blank', 'width=550,height=420');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      setCopied(true);
      toast({
        title: "Copied to clipboard!",
        description: "Share text and link copied successfully.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please try again or copy manually.",
        variant: "destructive",
      });
    }
  };

  const handleWebShare = async () => {
    if (navigator.share && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `Is That Still True? - ${fact.category} Facts Debunked`,
          text: shortShareText,
          url: shareUrl,
        });
      } catch (error) {
        console.log('Web share cancelled or failed:', error);
        // Fallback to copy on any error
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="pt-4 border-t border-border/20">
      <p className="text-sm text-muted-foreground mb-3">Share this mind-blowing fact:</p>
      
      {/* Mobile-first native share button */}
      <div className="block md:hidden mb-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleWebShare}
          className="w-full justify-center gap-2 min-h-[44px] hover:bg-primary/10 hover:border-primary/20 hover:text-primary transition-colors"
        >
          <Share2 className="h-4 w-4" />
          Share this fact
        </Button>
      </div>
      
      {/* Desktop share buttons */}
      <div className="hidden md:block">
        <div className="flex flex-wrap gap-2">
          {/* Twitter/X */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleTwitterShare}
            className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            <span>X/Twitter</span>
          </Button>

          {/* Facebook */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleFacebookShare}
            className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors"
          >
            <Facebook className="h-4 w-4" />
            <span>Facebook</span>
          </Button>

          {/* LinkedIn */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleLinkedInShare}
            className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors"
          >
            <Linkedin className="h-4 w-4" />
            <span>LinkedIn</span>
          </Button>

          {/* Reddit */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRedditShare}
            className="flex items-center gap-2 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Reddit</span>
          </Button>

          {/* Copy Link */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="flex items-center gap-2 hover:bg-green-50 hover:border-green-200 hover:text-green-600 transition-colors"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? "Copied!" : "Copy"}</span>
          </Button>

          {/* Native Share fallback */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleWebShare}
            className="flex items-center gap-2 hover:bg-primary/10 hover:border-primary/20 hover:text-primary transition-colors"
          >
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </Button>
        </div>
      </div>
    </div>
  );
};