-- Create fact_reports table for user-reported facts
CREATE TABLE IF NOT EXISTS public.fact_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fact_hash TEXT NOT NULL,
  country TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  fact_content TEXT NOT NULL,
  report_reason TEXT NOT NULL,
  user_fingerprint TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_fact_reports_hash ON public.fact_reports(fact_hash);
CREATE INDEX IF NOT EXISTS idx_fact_reports_created_at ON public.fact_reports(created_at);

-- Enable RLS
ALTER TABLE public.fact_reports ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert reports (anonymous reporting)
CREATE POLICY "Anyone can report facts"
  ON public.fact_reports
  FOR INSERT
  WITH CHECK (true);

-- Only admins can view reports (for moderation)
CREATE POLICY "Only admins can view reports"
  ON public.fact_reports
  FOR SELECT
  USING (false); -- Will need admin role system to enable viewing

-- Create school_research_cache table for cached school memories
CREATE TABLE IF NOT EXISTS public.school_research_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_name TEXT NOT NULL,
  city TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  research_results JSONB NOT NULL,
  historical_headlines JSONB,
  shareable_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(school_name, city, graduation_year)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_school_cache_lookup ON public.school_research_cache(school_name, city, graduation_year);
CREATE INDEX IF NOT EXISTS idx_school_cache_created_at ON public.school_research_cache(created_at);

-- Enable RLS
ALTER TABLE public.school_research_cache ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read cached school memories (public data)
CREATE POLICY "Anyone can view school memories"
  ON public.school_research_cache
  FOR SELECT
  USING (true);

-- Only system can insert/update cache (via edge functions)
CREATE POLICY "System can manage cache"
  ON public.school_research_cache
  FOR ALL
  USING (false)
  WITH CHECK (false); -- Will be managed via service role in edge functions