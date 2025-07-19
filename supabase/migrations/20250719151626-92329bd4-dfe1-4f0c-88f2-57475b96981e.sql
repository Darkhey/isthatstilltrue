
-- Tabelle für gemeldete Fakten
CREATE TABLE public.fact_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_hash TEXT NOT NULL, -- Hash der Faktdaten für Identifikation
  country TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  fact_content TEXT NOT NULL,
  report_reason TEXT NOT NULL,
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_fingerprint TEXT, -- Optional: anonyme Nutzer-Identifikation
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved'))
);

-- Tabelle für Fakt-Qualitätsstatistiken
CREATE TABLE public.fact_quality_stats (
  fact_hash TEXT PRIMARY KEY,
  country TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  total_reports INTEGER DEFAULT 0,
  auto_replaced_at TIMESTAMP WITH TIME ZONE,
  replacement_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Policies für fact_reports (öffentlich lesbar für Transparenz)
ALTER TABLE public.fact_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read fact reports" 
  ON public.fact_reports 
  FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can report facts" 
  ON public.fact_reports 
  FOR INSERT 
  WITH CHECK (true);

-- RLS Policies für fact_quality_stats (öffentlich lesbar)
ALTER TABLE public.fact_quality_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read fact quality stats" 
  ON public.fact_quality_stats 
  FOR SELECT 
  USING (true);

CREATE POLICY "Service role can manage fact quality stats" 
  ON public.fact_quality_stats 
  FOR ALL 
  USING (auth.role() = 'service_role'::text);

-- Index für bessere Performance bei Abfragen
CREATE INDEX idx_fact_reports_hash ON public.fact_reports(fact_hash);
CREATE INDEX idx_fact_reports_country_year ON public.fact_reports(country, graduation_year);
CREATE INDEX idx_fact_quality_stats_country_year ON public.fact_quality_stats(country, graduation_year);
