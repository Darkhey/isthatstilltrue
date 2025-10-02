import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SchoolMemoryCard } from "@/components/SchoolMemoryCard";
import { SchoolShareCard } from "@/components/SchoolShareCard";
import { HistoricalHeadlines } from "@/components/HistoricalHeadlines";
import { FactSkeleton } from "@/components/FactSkeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SchoolMemoryData {
  school_name: string;
  city: string;
  graduation_year: number;
  research_results: any;
  shareable_content: any;
  historical_headlines: any;
  created_at: string;
}

const SchoolMemoryShare = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SchoolMemoryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSchoolMemory = async () => {
      if (!slug) {
        setError("Invalid URL");
        setLoading(false);
        return;
      }

      try {
        // Parse slug: school-name-city-year
        const parts = slug.split('-');
        if (parts.length < 3) {
          setError("Invalid URL format");
          setLoading(false);
          return;
        }

        const year = parseInt(parts[parts.length - 1]);
        const city = parts[parts.length - 2];
        const schoolName = parts.slice(0, -2).join(' ');

        if (!year || !city || !schoolName) {
          setError("Could not parse school information from URL");
          setLoading(false);
          return;
        }

        // Query the cache table
        const { data: cacheData, error: cacheError } = await supabase
          .from('school_research_cache')
          .select('*')
          .eq('school_name', schoolName)
          .eq('city', city)
          .eq('graduation_year', year)
          .single();

        if (cacheError || !cacheData) {
          setError("School memory not found");
          setLoading(false);
          return;
        }

        setData(cacheData);
      } catch (error) {
        console.error('Error loading school memory:', error);
        setError("Failed to load school memory");
      } finally {
        setLoading(false);
      }
    };

    loadSchoolMemory();
  }, [slug]);

  const handleCopyLink = async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    toast({
      title: "Link copied!",
      description: "Share this link with your classmates",
      duration: 2000,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {[...Array(3)].map((_, i) => (
            <FactSkeleton key={i} index={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <div className="max-w-4xl mx-auto text-center py-20">
          <h1 className="text-2xl font-bold mb-4">School Memory Not Found</h1>
          <p className="text-muted-foreground mb-6">{error || "The requested school memory could not be found."}</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card/50 backdrop-blur-sm p-6 rounded-lg border">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {data.school_name} Memories
            </h1>
            <p className="text-muted-foreground">
              {data.city} • Class of {data.graduation_year}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCopyLink}>
              <Share2 className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
            <Button variant="outline" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>

        {/* School Memory Card */}
        <SchoolMemoryCard 
          memoryData={data.research_results}
          schoolName={data.school_name}
          city={data.city}
          graduationYear={data.graduation_year}
        />

        {/* Historical Headlines */}
        {data.historical_headlines && data.historical_headlines.length > 0 && (
          <HistoricalHeadlines 
            headlines={data.historical_headlines}
            year={data.graduation_year}
          />
        )}

        {/* Share Card */}
        <SchoolShareCard
          schoolName={data.school_name}
          city={data.city}
          graduationYear={data.graduation_year}
          shareableContent={data.shareable_content}
        />
      </div>
    </div>
  );
};

export default SchoolMemoryShare;