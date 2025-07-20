-- Purge all fact-related tables for fresh start
DELETE FROM public.fact_reports;
DELETE FROM public.fact_quality_stats;
DELETE FROM public.fact_variants;
DELETE FROM public.cached_facts;