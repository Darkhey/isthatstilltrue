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
    const shortFact = fact.fact.length > 80 ? fact.fact.substring(0, 80) + "..." : fact.fact;
    return `🤯 I just discovered that what I learned in ${graduationYear} about ${fact.category.toLowerCase()} was COMPLETELY WRONG!

"${shortFact}"

Turns out this was debunked in ${fact.yearDebunked}! 😱

Check out what other "facts" from your school days are total BS: https://isthatstilltrue.com

#FactCheck #Education #Science #DidYouKnow #SchoolLies #Learning`;
  };

  const generateShortShareText = () => {
    return `🤯 What I learned in school about ${fact.category.toLowerCase()} was completely wrong! Debunked in ${fact.yearDebunked}. Check out isthatstilltrue.com to see what other school "facts" are BS! #FactCheck #Education`;
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
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Is That Still True? - ${fact.category} Facts Debunked`,
          text: shortShareText,
          url: shareUrl,
        });
      } catch (error) {
        console.log('Web share cancelled or failed');
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="flex flex-wrap gap-2 pt-4 border-t border-border/20">
      <p className="text-sm text-muted-foreground mb-2 w-full">Share this mind-blowing fact:</p>
      
      <div className="flex flex-wrap gap-2">
        {/* Twitter/X */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleTwitterShare}
          className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="hidden sm:inline">X/Twitter</span>
        </Button>

        {/* Facebook */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleFacebookShare}
          className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors"
        >
          <Facebook className="h-4 w-4" />
          <span className="hidden sm:inline">Facebook</span>
        </Button>

        {/* LinkedIn */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLinkedInShare}
          className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors"
        >
          <Linkedin className="h-4 w-4" />
          <span className="hidden sm:inline">LinkedIn</span>
        </Button>

        {/* Reddit */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleRedditShare}
          className="flex items-center gap-2 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Reddit</span>
        </Button>

        {/* Copy Link */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
          className="flex items-center gap-2 hover:bg-green-50 hover:border-green-200 hover:text-green-600 transition-colors"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          <span className="hidden sm:inline">{copied ? "Copied!" : "Copy"}</span>
        </Button>

        {/* Native Share (mobile) */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleWebShare}
          className="flex items-center gap-2 hover:bg-primary/10 hover:border-primary/20 hover:text-primary transition-colors"
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Share</span>
        </Button>
      </div>
    </div>
  );
};