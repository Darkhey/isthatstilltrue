
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Globe, Flag, Gamepad2, Monitor, Trophy } from "lucide-react";

interface HistoricalHeadline {
  title: string;
  date: string;
  description: string;
  category: 'world' | 'national' | 'local' | 'culture' | 'technology' | 'sports';
  source?: string;
}

interface HistoricalHeadlinesProps {
  headlines: HistoricalHeadline[];
  year: number;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'world':
      return Globe;
    case 'national':
      return Flag;
    case 'culture':
      return Calendar;
    case 'technology':
      return Monitor;
    case 'sports':
      return Trophy;
    default:
      return Globe;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'world':
      return 'bg-blue-100 text-blue-800';
    case 'national':
      return 'bg-red-100 text-red-800';
    case 'culture':
      return 'bg-purple-100 text-purple-800';
    case 'technology':
      return 'bg-green-100 text-green-800';
    case 'sports':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const HistoricalHeadlines = ({ headlines, year }: HistoricalHeadlinesProps) => {
  if (!headlines || headlines.length === 0) {
    return null;
  }

  return (
    <Card className="w-full shadow-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Was geschah {year}?
        </CardTitle>
        <CardDescription>
          Wichtige Ereignisse aus dem Jahr deines Schulabschlusses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {headlines.map((headline, index) => {
            const IconComponent = getCategoryIcon(headline.category);
            const categoryColor = getCategoryColor(headline.category);
            
            return (
              <div
                key={index}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-primary/10 shrink-0">
                    <IconComponent className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-semibold text-sm leading-tight">
                        {headline.title}
                      </h4>
                      <Badge className={`text-xs ${categoryColor} shrink-0`}>
                        {headline.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {headline.date}
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {headline.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
