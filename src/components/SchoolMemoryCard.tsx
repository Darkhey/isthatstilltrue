import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building, Calendar, MapPin, Users, BookOpen, Zap, Flag, Share2, ExternalLink, type LucideIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SchoolEvent {
  title: string;
  description: string;
  category: "facilities" | "academics" | "sports" | "culture" | "technology";
  sourceUrl?: string;
  sourceName?: string;
}

interface NostalgiaFactor {
  memory: string;
  shareableText: string;
  sourceUrl?: string;
  sourceName?: string;
}

interface LocalContext {
  event: string;
  relevance: string;
  sourceUrl?: string;
  sourceName?: string;
}

interface SchoolMemoryData {
  whatHappenedAtSchool: SchoolEvent[];
  nostalgiaFactors: NostalgiaFactor[];
  localContext: LocalContext[];
  shareableQuotes: string[];
}

interface SchoolMemoryCardProps {
  schoolName: string;
  city: string;
  graduationYear: number;
  memoryData: SchoolMemoryData;
  shareableText?: string;
  schoolImage?: string;
}

const getCategoryIcon = (category: string): LucideIcon => {
  const iconMap: Record<string, LucideIcon> = {
    "facilities": Building,
    "academics": BookOpen,
    "sports": Users,
    "culture": Calendar,
    "technology": Zap,
  };
  return iconMap[category] || BookOpen;
};

const getCategoryColor = (category: string): string => {
  const colorMap: Record<string, string> = {
    "facilities": "bg-blue-500",
    "academics": "bg-green-500",
    "sports": "bg-orange-500",
    "culture": "bg-purple-500",
    "technology": "bg-cyan-500",
  };
  return colorMap[category] || "bg-primary";
};

export const SchoolMemoryCard = ({ schoolName, city, graduationYear, memoryData, shareableText, schoolImage }: SchoolMemoryCardProps) => {
  const { toast } = useToast();

  const handleReportIssue = () => {
    toast({
      title: "Thank you for your feedback!",
      description: "Your report helps us improve the information quality.",
      duration: 3000,
    });
  };

  const handleShare = async () => {
    const text = shareableText || `Memories from ${schoolName} in ${city} - Class of ${graduationYear}! 🎓✨ This nostalgia brings back so many memories...`;
    
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
          description: "Now you can share it anywhere you want",
          duration: 2000,
        });
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Text copied!",
        description: "Now you can share it anywhere you want",
        duration: 2000,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with School Image */}
      <Card className="bg-gradient-primary text-primary-foreground overflow-hidden">
        <div className="relative">
          <div className="h-48 bg-gradient-to-r from-primary/80 to-primary-glow/60 flex items-center justify-center relative">
            <img 
              src={schoolImage || `https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=800&h=300&fit=crop&crop=center&auto=format&q=80`}
              alt={`${schoolName} school building`}
              className="w-full h-full object-cover opacity-60"
              onError={(e) => {
                // Fallback to different school images if main one fails
                const fallbackImages = [
                  'photo-1518005020951-eccb494ad742',
                  'photo-1496307653780-42ee777d4833',
                  'photo-1449157291145-7efd050a4d0e'
                ];
                const currentSrc = e.currentTarget.src;
                const currentImageId = currentSrc.match(/photo-([a-f0-9-]+)/)?.[1];
                const currentIndex = fallbackImages.findIndex(id => currentSrc.includes(id));
                const nextIndex = (currentIndex + 1) % fallbackImages.length;
                if (nextIndex < fallbackImages.length && !schoolImage) {
                  e.currentTarget.src = `https://images.unsplash.com/photo-${fallbackImages[nextIndex]}?w=800&h=300&fit=crop&crop=center&auto=format&q=80`;
                }
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-transparent" />
          </div>
          <CardHeader className="absolute bottom-0 left-0 right-0 text-center bg-gradient-to-t from-primary/95 to-transparent pt-8">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <Building className="h-6 w-6" />
              {schoolName}
            </CardTitle>
            <CardDescription className="text-primary-foreground/80 flex items-center justify-center gap-4">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {city}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Class of {graduationYear}
              </span>
            </CardDescription>
          </CardHeader>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center">
        <Button 
          onClick={handleShare}
          className="bg-gradient-primary hover:opacity-90 text-primary-foreground"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share Nostalgia ✨
        </Button>
        <Button 
          onClick={handleReportIssue}
          variant="outline"
        >
          <Flag className="h-4 w-4 mr-2" />
          Report Inaccuracy
        </Button>
      </div>

      {/* What Happened at Your School That Year */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            What Happened at Your School That Year
          </CardTitle>
          <CardDescription>
            Notable events and changes during your graduation year
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {memoryData.whatHappenedAtSchool?.map((event, index) => {
            const IconComponent = getCategoryIcon(event.category);
            const handleEventClick = () => {
              if (event.sourceUrl) {
                window.open(event.sourceUrl, '_blank');
              }
            };
            
            return (
              <div 
                key={index} 
                className={`flex gap-4 p-4 bg-background/50 rounded-lg border transition-all duration-200 ${
                  event.sourceUrl ? 'cursor-pointer hover:bg-background/70 hover:border-primary/40' : ''
                }`}
                onClick={handleEventClick}
              >
                <div className={`p-2 rounded-full ${getCategoryColor(event.category)} text-white flex-shrink-0`}>
                  <IconComponent className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold">{event.title}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="capitalize text-xs">
                        {event.category}
                      </Badge>
                      {event.sourceUrl && (
                        <Badge variant="outline" className="text-xs">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {event.sourceName || 'Source'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                  {event.sourceUrl && (
                    <p className="text-xs text-primary mt-2">Click to view source →</p>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Nostalgia Triggers */}
      {memoryData.nostalgiaFactors?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              School Memories & Nostalgia
            </CardTitle>
            <CardDescription>
              Shared experiences that will bring back memories
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {memoryData.nostalgiaFactors.map((nostalgia, index) => {
              const handleNostalgiaClick = () => {
                if (nostalgia.sourceUrl) {
                  window.open(nostalgia.sourceUrl, '_blank');
                }
              };
              
              return (
                <div 
                  key={index} 
                  className={`p-4 bg-primary/5 rounded-lg border border-primary/20 transition-all duration-200 ${
                    nostalgia.sourceUrl ? 'cursor-pointer hover:bg-primary/10 hover:border-primary/40' : ''
                  }`}
                  onClick={handleNostalgiaClick}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-medium flex-1">{nostalgia.memory}</p>
                    {nostalgia.sourceUrl && (
                      <Badge variant="outline" className="text-xs">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        {nostalgia.sourceName || 'Source'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground italic">
                    💬 "{nostalgia.shareableText}"
                  </p>
                  {nostalgia.sourceUrl && (
                    <p className="text-xs text-primary mt-2">Click to view source →</p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Local Context */}
      {memoryData.localContext?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Local Historical Context
            </CardTitle>
            <CardDescription>
              What was happening in your area during your school years
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {memoryData.localContext.map((context, index) => {
              const handleContextClick = () => {
                if (context.sourceUrl) {
                  window.open(context.sourceUrl, '_blank');
                }
              };
              
              return (
                <div 
                  key={index} 
                  className={`p-4 bg-background/50 rounded-lg border transition-all duration-200 ${
                    context.sourceUrl ? 'cursor-pointer hover:bg-background/70 hover:border-primary/40' : ''
                  }`}
                  onClick={handleContextClick}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold flex-1">{context.event}</h4>
                    {context.sourceUrl && (
                      <Badge variant="outline" className="text-xs">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        {context.sourceName || 'Source'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{context.relevance}</p>
                  {context.sourceUrl && (
                    <p className="text-xs text-primary mt-2">Click to view source →</p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
};