-- Create community memories system for school-specific user contributions

-- Table for user-contributed school memories and facts
CREATE TABLE public.user_school_memories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_name text NOT NULL,
  city text NOT NULL,
  graduation_year integer NOT NULL,
  user_fingerprint text, -- For anonymous users (IP-based)
  content text NOT NULL CHECK (length(content) >= 10 AND length(content) <= 1000),
  memory_type text DEFAULT 'memory' CHECK (memory_type IN ('memory', 'fact', 'teacher', 'event', 'culture')),
  like_count integer DEFAULT 0,
  is_verified boolean DEFAULT false, -- Admin can verify quality content
  is_flagged boolean DEFAULT false, -- For moderation
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table for tracking likes on memories
CREATE TABLE public.memory_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id uuid NOT NULL REFERENCES public.user_school_memories(id) ON DELETE CASCADE,
  user_fingerprint text NOT NULL, -- Same fingerprinting as memories
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(memory_id, user_fingerprint) -- Prevent duplicate likes
);

-- Table for rate limiting and spam prevention
CREATE TABLE public.user_activity_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_fingerprint text NOT NULL,
  school_name text NOT NULL,
  city text NOT NULL,
  graduation_year integer NOT NULL,
  last_memory_posted timestamp with time zone,
  daily_memory_count integer DEFAULT 0,
  daily_like_count integer DEFAULT 0,
  reset_date date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_fingerprint, school_name, city, graduation_year)
);

-- Enable Row Level Security
ALTER TABLE public.user_school_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_school_memories
CREATE POLICY "Anyone can read school memories" 
ON public.user_school_memories 
FOR SELECT 
USING (NOT is_flagged); -- Hide flagged content

CREATE POLICY "Anyone can create school memories" 
ON public.user_school_memories 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can manage school memories" 
ON public.user_school_memories 
FOR ALL 
USING (auth.role() = 'service_role');

-- RLS Policies for memory_likes
CREATE POLICY "Anyone can read memory likes" 
ON public.memory_likes 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create memory likes" 
ON public.memory_likes 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can manage memory likes" 
ON public.memory_likes 
FOR ALL 
USING (auth.role() = 'service_role');

-- RLS Policies for user_activity_limits
CREATE POLICY "Service role can manage activity limits" 
ON public.user_activity_limits 
FOR ALL 
USING (auth.role() = 'service_role');

-- Function to update like count when likes are added/removed
CREATE OR REPLACE FUNCTION public.update_memory_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.user_school_memories 
    SET like_count = like_count + 1 
    WHERE id = NEW.memory_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.user_school_memories 
    SET like_count = GREATEST(like_count - 1, 0) 
    WHERE id = OLD.memory_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update like counts
CREATE TRIGGER update_memory_like_count_trigger
  AFTER INSERT OR DELETE ON public.memory_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_memory_like_count();

-- Trigger for updating timestamps
CREATE TRIGGER update_user_school_memories_updated_at
  BEFORE UPDATE ON public.user_school_memories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_activity_limits_updated_at
  BEFORE UPDATE ON public.user_activity_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for better performance
CREATE INDEX idx_user_school_memories_school_year ON public.user_school_memories(school_name, city, graduation_year);
CREATE INDEX idx_user_school_memories_created_at ON public.user_school_memories(created_at DESC);
CREATE INDEX idx_user_school_memories_like_count ON public.user_school_memories(like_count DESC);
CREATE INDEX idx_memory_likes_memory_id ON public.memory_likes(memory_id);
CREATE INDEX idx_user_activity_limits_fingerprint ON public.user_activity_limits(user_fingerprint);