-- Add country column to school_research_cache table
ALTER TABLE public.school_research_cache 
ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'unknown';