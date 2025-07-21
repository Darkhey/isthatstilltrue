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
  shareableUrl?: string;
}

export const SchoolShareCard = ({ schoolName, city, graduationYear, shareableContent, shareableUrl }: SchoolShareCardProps) => {
  const { toast } = useToast();

  const createSlug = (school: string, city: string, year: number) => {
    return `${school}-${city}-${year}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
  };

  const getShareableUrl = () => {
    if (shareableUrl) return shareableUrl;
    const slug = createSlug(schoolName, city, graduationYear);
    return `${window.location.origin}/school/${slug}`;
  };

  const handleQuickShare = async () => {
    const shareUrl = getShareableUrl();
    const text = `${shareableContent.mainShare}\n\nSee full memories: ${shareUrl}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${schoolName} Memories`,
          text: shareableContent.mainShare,
          url: shareUrl,
        });
      } catch (error) {
        await navigator.clipboard.writeText(text);
        toast({
          title: "Text copied!",
          description: "Share this with your classmates",
          duration: 2000,
        });
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Text copied!",
        description: "Share this with your classmates",
        duration: 2000,
      });
    }
  };

  const handleCopyLink = async () => {
    const shareUrl = getShareableUrl();
    await navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link copied!",
      description: "Share this link with your classmates",
      duration: 2000,
    });
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Share2 className="h-5 w-5" />
          Share Nostalgia
        </CardTitle>
        <CardDescription>
          Share these memories with your {schoolName} classmates
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-sm italic">{shareableContent.mainShare}</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleQuickShare}
            size="lg"
            className="bg-gradient-primary hover:opacity-90 text-primary-foreground flex-1"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share Nostalgia ✨
          </Button>
          
          <Button
            onClick={handleCopyLink}
            variant="outline"
            size="lg"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Share memories and link with your classmates!
        </p>
      </CardContent>
    </Card>
  );
};