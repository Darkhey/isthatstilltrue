CREATE TABLE public.shared_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  fact_data jsonb NOT NULL,
  country text NOT NULL,
  graduation_year integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.shared_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shared facts"
  ON public.shared_facts FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create shared facts"
  ON public.shared_facts FOR INSERT
  WITH CHECK (true);