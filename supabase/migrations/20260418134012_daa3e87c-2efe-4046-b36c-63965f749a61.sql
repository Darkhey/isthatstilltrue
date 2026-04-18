-- Create quiz leaderboard table
CREATE TABLE public.quiz_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nickname text NOT NULL DEFAULT 'Anonymous',
  score integer NOT NULL,
  total_questions integer NOT NULL,
  language text NOT NULL DEFAULT 'en',
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Validate values via trigger (CHECK constraints with subqueries are limited; simple bounds here are fine but using trigger for consistency with project guidelines)
CREATE OR REPLACE FUNCTION public.validate_quiz_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.score < 0 OR NEW.score > NEW.total_questions THEN
    RAISE EXCEPTION 'Invalid score: must be between 0 and total_questions';
  END IF;
  IF NEW.total_questions <= 0 OR NEW.total_questions > 100 THEN
    RAISE EXCEPTION 'Invalid total_questions';
  END IF;
  IF length(NEW.nickname) > 30 THEN
    NEW.nickname := substring(NEW.nickname from 1 for 30);
  END IF;
  IF length(trim(NEW.nickname)) = 0 THEN
    NEW.nickname := 'Anonymous';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_quiz_score_trigger
BEFORE INSERT ON public.quiz_scores
FOR EACH ROW
EXECUTE FUNCTION public.validate_quiz_score();

-- Index for fast leaderboard queries
CREATE INDEX idx_quiz_scores_leaderboard ON public.quiz_scores (score DESC, created_at DESC);

-- Enable RLS
ALTER TABLE public.quiz_scores ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a score
CREATE POLICY "Anyone can submit quiz scores"
ON public.quiz_scores
FOR INSERT
WITH CHECK (true);

-- Anyone can view the leaderboard
CREATE POLICY "Anyone can view quiz scores"
ON public.quiz_scores
FOR SELECT
USING (true);