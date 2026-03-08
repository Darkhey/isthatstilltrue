import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Du generierst Quiz-Fragen für "Is That Still True?" – ein Quiz über veraltetes Schulwissen.

Erstelle exakt 10 Fragen. Jede Frage ist eine Behauptung, die Schüler in der Schule gelernt haben. Manche stimmen noch, manche nicht mehr.

Antworte NUR als JSON-Array, ohne Markdown-Codeblöcke, ohne Erklärung. Format:
[
  {
    "claim": "Pluto ist ein Planet",
    "isStillTrue": false,
    "explanation": "Pluto wurde 2006 von der IAU zum Zwergplaneten herabgestuft.",
    "category": "Astronomie",
    "mindBlown": "Pluto ist kleiner als der Erdmond!"
  }
]

Regeln:
- Mix aus true und false (ca. 40-60% sollten false sein)
- Verschiedene Fächer: Biologie, Physik, Geographie, Geschichte, Chemie, Astronomie, Mathe
- Spannende, überraschende Fakten bevorzugen
- Kurze, knackige Erklärungen (max 2 Sätze)
- "mindBlown" ist ein optionaler Fun-Fact dazu
- Sprache: Antworte in der Sprache der User-Nachricht`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { language = "de" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = language === "de"
      ? "Generiere 10 Quiz-Fragen auf Deutsch über veraltetes Schulwissen."
      : "Generate 10 quiz questions in English about outdated school knowledge.";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "Failed to generate quiz" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    
    // Parse JSON from response (handle markdown code blocks)
    let questions;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      questions = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse quiz JSON:", content);
      return new Response(JSON.stringify({ error: "Failed to parse quiz" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("quiz-generator error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
