import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Share2, MessageCircle, Instagram, Twitter, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareableContent {
  mainShare: string;
  whatsappShare: string;
  instagramStory: string;
  twitterPost: string;
  variants: string[];
}

interface SchoolShareCardProps {
  schoolName: string;
  city: string;
  graduationYear: number;
  shareableContent: ShareableContent;
}

export const SchoolShareCard = ({ schoolName, city, graduationYear, shareableContent }: SchoolShareCardProps) => {
  const { toast } = useToast();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard!",
        description: "Ready to share with your classmates",
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy manually",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  const shareViaWhatsApp = (text: string) => {
    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareViaTwitter = (text: string) => {
    const encodedText = encodeURIComponent(text);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    window.open(twitterUrl, '_blank');
  };

  const shareNatively = async (text: string, title: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: text,
        });
      } catch (error) {
        // Fallback to copy if native sharing fails or is cancelled
        copyToClipboard(text);
      }
    } else {
      copyToClipboard(text);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Share Your School Memories
        </CardTitle>
        <CardDescription>
          Share these nostalgic memories with your {schoolName} classmates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Share */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Main Share</h4>
          <div className="p-3 bg-background/50 rounded-lg border text-sm">
            {shareableContent.mainShare}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => shareNatively(shareableContent.mainShare, `${schoolName} Memories`)}
              className="flex items-center gap-1"
            >
              <Share2 className="h-3 w-3" />
              Share
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => shareViaWhatsApp(shareableContent.whatsappShare)}
              className="flex items-center gap-1"
            >
              <MessageCircle className="h-3 w-3" />
              WhatsApp
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(shareableContent.mainShare)}
              className="flex items-center gap-1"
            >
              <Copy className="h-3 w-3" />
              Copy
            </Button>
          </div>
        </div>

        {/* Platform-specific variants */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Platform-Specific Versions</h4>
          
          {/* Twitter */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Twitter className="h-4 w-4" />
              <span className="text-sm font-medium">Twitter/X</span>
            </div>
            <div className="p-3 bg-background/50 rounded-lg border text-sm">
              {shareableContent.twitterPost}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => shareViaTwitter(shareableContent.twitterPost)}
              className="flex items-center gap-1"
            >
              <Twitter className="h-3 w-3" />
              Post on X
            </Button>
          </div>

          {/* Instagram Story */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Instagram className="h-4 w-4" />
              <span className="text-sm font-medium">Instagram Story</span>
            </div>
            <div className="p-3 bg-background/50 rounded-lg border text-sm whitespace-pre-line">
              {shareableContent.instagramStory}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(shareableContent.instagramStory)}
              className="flex items-center gap-1"
            >
              <Copy className="h-3 w-3" />
              Copy for Story
            </Button>
          </div>
        </div>

        {/* Additional shareable quotes */}
        {shareableContent.variants?.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">More Shareable Quotes</h4>
            {shareableContent.variants.map((quote, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-background/30 rounded border">
                <div className="flex-1 text-sm">{quote}</div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(quote)}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};