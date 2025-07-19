-- Add education system problems column to cached_facts table
ALTER TABLE public.cached_facts 
ADD COLUMN education_system_problems jsonb;