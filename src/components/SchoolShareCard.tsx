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

  const handleQuickShare = async () => {
    const text = shareableContent.mainShare;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${schoolName} Memories`,
          text: text,
        });
      } catch (error) {
        await navigator.clipboard.writeText(text);
        toast({
          title: "Text copied!",
          description: "Now you can share it everywhere",
          duration: 2000,
        });
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Text copied!",
        description: "Now you can share it everywhere",
        duration: 2000,
      });
    }
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
        
        <Button
          onClick={handleQuickShare}
          size="lg"
          className="bg-gradient-primary hover:opacity-90 text-primary-foreground w-full"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share Nostalgia ✨
        </Button>
        
        <p className="text-xs text-muted-foreground">
          Click to share or copy - anywhere you want!
        </p>
      </CardContent>
    </Card>
  );
};