import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, Calendar, MapPin, Users, BookOpen, Zap, type LucideIcon } from "lucide-react";

interface SchoolEvent {
  title: string;
  description: string;
  category: "facilities" | "academics" | "sports" | "culture" | "technology";
}

interface NostalgiaFactor {
  memory: string;
  shareableText: string;
}

interface LocalContext {
  event: string;
  relevance: string;
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

export const SchoolMemoryCard = ({ schoolName, city, graduationYear, memoryData }: SchoolMemoryCardProps) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-primary text-primary-foreground">
        <CardHeader className="text-center">
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
      </Card>

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
            return (
              <div key={index} className="flex gap-4 p-4 bg-background/50 rounded-lg border">
                <div className={`p-2 rounded-full ${getCategoryColor(event.category)} text-white flex-shrink-0`}>
                  <IconComponent className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold">{event.title}</h4>
                    <Badge variant="secondary" className="capitalize text-xs">
                      {event.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{event.description}</p>
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
            {memoryData.nostalgiaFactors.map((nostalgia, index) => (
              <div key={index} className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="font-medium mb-2">{nostalgia.memory}</p>
                <p className="text-sm text-muted-foreground italic">
                  💬 "{nostalgia.shareableText}"
                </p>
              </div>
            ))}
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
            {memoryData.localContext.map((context, index) => (
              <div key={index} className="p-4 bg-background/50 rounded-lg border">
                <h4 className="font-semibold mb-2">{context.event}</h4>
                <p className="text-sm text-muted-foreground">{context.relevance}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};