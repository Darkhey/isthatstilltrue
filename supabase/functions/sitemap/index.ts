import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE = "https://isthatstilltrue.com";

const STATIC_PAGES = [
  { loc: "/", priority: "1.0", changefreq: "weekly" },
  { loc: "/ask", priority: "0.9", changefreq: "weekly" },
  { loc: "/about", priority: "0.8", changefreq: "monthly" },
  { loc: "/how-it-works", priority: "0.8", changefreq: "monthly" },
  { loc: "/terms", priority: "0.5", changefreq: "monthly" },
  { loc: "/privacy", priority: "0.5", changefreq: "monthly" },
  { loc: "/imprint", priority: "0.5", changefreq: "monthly" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date().toISOString().split("T")[0];

    // Fetch dynamic URLs in parallel
    const [factsRes, schoolsRes] = await Promise.all([
      supabase.from("shared_facts").select("slug, created_at").order("created_at", { ascending: false }).limit(1000),
      supabase.from("school_research_cache").select("school_name, city, created_at").order("created_at", { ascending: false }).limit(1000),
    ]);

    let urls = STATIC_PAGES.map(p => `  <url>
    <loc>${BASE}${p.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`);

    // Add /fact/:slug URLs
    if (factsRes.data) {
      for (const f of factsRes.data) {
        const lastmod = f.created_at ? f.created_at.split("T")[0] : today;
        urls.push(`  <url>
    <loc>${BASE}/fact/${f.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`);
      }
    }

    // Add /school/:slug URLs (slug = school_name-city, URL-encoded)
    if (schoolsRes.data) {
      const seen = new Set<string>();
      for (const s of schoolsRes.data) {
        const slug = encodeURIComponent(`${s.school_name}-${s.city}`.toLowerCase().replace(/\s+/g, "-"));
        if (seen.has(slug)) continue;
        seen.add(slug);
        const lastmod = s.created_at ? s.created_at.split("T")[0] : today;
        urls.push(`  <url>
    <loc>${BASE}/school/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`);
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    return new Response(xml, {
      headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8" },
    });
  } catch (e) {
    console.error("sitemap error:", e);
    return new Response("Internal Server Error", { status: 500, headers: corsHeaders });
  }
});
