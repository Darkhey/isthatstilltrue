-- Create school_memories table for storing AI-generated school-specific content
CREATE TABLE public.school_memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_name TEXT NOT NULL,
  city TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  school_memories_data JSONB NOT NULL DEFAULT '{}',
  shareable_content JSONB NOT NULL DEFAULT '{}',
  research_sources JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.school_memories ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Anyone can read school memories" 
ON public.school_memories 
FOR SELECT 
USING (true);

-- Service role can manage all data
CREATE POLICY "Service role can manage school memories" 
ON public.school_memories 
FOR ALL 
USING (auth.role() = 'service_role'::text);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_school_memories_updated_at
BEFORE UPDATE ON public.school_memories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient lookups
CREATE INDEX idx_school_memories_lookup 
ON public.school_memories(school_name, city, graduation_year);