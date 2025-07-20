-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create fact_variants table for storing multiple fact sets per country-year
CREATE TABLE public.fact_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  variant_number INTEGER NOT NULL CHECK (variant_number >= 1 AND variant_number <= 3),
  facts_data JSONB NOT NULL,
  education_system_problems JSONB,
  quick_fun_fact TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(country, graduation_year, variant_number)
);

-- Enable RLS
ALTER TABLE public.fact_variants ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read fact variants" 
ON public.fact_variants 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage fact variants" 
ON public.fact_variants 
FOR ALL 
USING (auth.role() = 'service_role'::text);

-- Create index for efficient queries
CREATE INDEX idx_fact_variants_country_year ON public.fact_variants(country, graduation_year);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_fact_variants_updated_at
BEFORE UPDATE ON public.fact_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();