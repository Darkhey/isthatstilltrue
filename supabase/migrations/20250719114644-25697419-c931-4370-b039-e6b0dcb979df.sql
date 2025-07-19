
-- Create a table to cache generated facts by country and graduation year
CREATE TABLE public.cached_facts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  facts_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create a composite unique index to prevent duplicate entries for the same country/year
CREATE UNIQUE INDEX idx_cached_facts_country_year ON public.cached_facts (country, graduation_year);

-- Create an index on created_at for efficient querying by date
CREATE INDEX idx_cached_facts_created_at ON public.cached_facts (created_at);

-- Enable Row Level Security (RLS) - facts can be read by anyone since they're educational content
ALTER TABLE public.cached_facts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read cached facts (they're educational content)
CREATE POLICY "Anyone can read cached facts" 
  ON public.cached_facts 
  FOR SELECT 
  USING (true);

-- Allow the service role to insert/update cached facts (edge functions)
CREATE POLICY "Service role can manage cached facts" 
  ON public.cached_facts 
  FOR ALL 
  USING (auth.role() = 'service_role');
