
-- Create comprehensive school research cache table
CREATE TABLE public.school_research_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_name TEXT NOT NULL,
  city TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  country TEXT NOT NULL DEFAULT 'Germany',
  research_results JSONB NOT NULL,
  shareable_content JSONB NOT NULL,
  historical_headlines JSONB,
  research_sources JSONB NOT NULL DEFAULT '{}',
  cache_expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Create composite unique constraint to prevent duplicates
  UNIQUE(school_name, city, graduation_year, country)
);

-- Enable RLS
ALTER TABLE public.school_research_cache ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to read cached results
CREATE POLICY "Anyone can read school research cache" 
  ON public.school_research_cache 
  FOR SELECT 
  USING (true);

-- Policy to allow service role to manage cache
CREATE POLICY "Service role can manage school research cache" 
  ON public.school_research_cache 
  FOR ALL 
  USING (auth.role() = 'service_role'::text);

-- Create index for faster lookups
CREATE INDEX idx_school_research_cache_lookup 
  ON public.school_research_cache(school_name, city, graduation_year, country);

-- Create index for cache expiration cleanup
CREATE INDEX idx_school_research_cache_expires 
  ON public.school_research_cache(cache_expires_at);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_school_research_cache_updated_at
  BEFORE UPDATE ON public.school_research_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
