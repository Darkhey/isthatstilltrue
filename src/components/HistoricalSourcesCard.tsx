import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Newspaper, Globe } from "lucide-react";

interface HistoricalSource {
  url: string;
  title: string;
  description?: string;
  source?: string;
  date?: string;
  type: 'news' | 'web';
}

interface HistoricalSourcesCardProps {
  sources: HistoricalSource[];
  year: number;
}

export const HistoricalSourcesCard = ({ sources, year }: HistoricalSourcesCardProps) => {
  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Newspaper className="h-5 w-5" />
          Historical Sources & Articles
        </CardTitle>
        <CardDescription>
          Newspaper articles and web sources about {year} and this period
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {sources.map((source, index) => (
          <a
            key={index}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 bg-background/50 rounded-lg border hover:bg-background/70 hover:border-primary/40 transition-all duration-200 group"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-start gap-2 flex-1">
                {source.type === 'news' ? (
                  <Newspaper className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                ) : (
                  <Globe className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h4 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2">
                    {source.title}
                  </h4>
                  {source.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {source.description}
                    </p>
                  )}
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0 transition-colors" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs capitalize">
                {source.type === 'news' ? 'News Article' : 'Web Source'}
              </Badge>
              {source.source && (
                <Badge variant="outline" className="text-xs">
                  {source.source}
                </Badge>
              )}
              {source.date && (
                <Badge variant="outline" className="text-xs">
                  {source.date}
                </Badge>
              )}
            </div>
          </a>
        ))}
      </CardContent>
    </Card>
  );
};
