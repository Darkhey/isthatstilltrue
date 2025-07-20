-- Migrate existing cached_facts to fact_variants as variant 1
INSERT INTO public.fact_variants (
  country,
  graduation_year,
  variant_number,
  facts_data,
  education_system_problems,
  quick_fun_fact,
  created_at,
  updated_at
)
SELECT 
  country,
  graduation_year,
  1 as variant_number,
  facts_data,
  education_system_problems,
  NULL as quick_fun_fact,
  created_at,
  updated_at
FROM public.cached_facts
WHERE facts_data IS NOT NULL
ON CONFLICT (country, graduation_year, variant_number) DO NOTHING;