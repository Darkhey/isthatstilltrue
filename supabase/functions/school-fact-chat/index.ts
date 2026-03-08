import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Du bist der "Is That Still True?" Fact-Checker Bot 🤓🔍

Deine Aufgabe: Schülern auf lockere, verständliche Art erklären, ob das was sie in der Schule gelernt haben noch stimmt.

## Stil & Ton
- Freundlich, locker, aber IMMER faktisch korrekt
- Nutze gelegentlich Emojis zur Auflockerung 🎓📚
- Erkläre komplexe Themen einfach und verständlich
- Sei enthusiastisch wenn du spannende Updates hast

## Antwort-Struktur
Antworte IMMER in diesem Format:

### ✅ Stimmt noch! / ❌ Stimmt nicht mehr! / ⚠️ Teilweise überholt!

**Was du gelernt hast:** [Kurze Zusammenfassung der alten Lehrmeinung]

**Was wir heute wissen:** [Aktuelle wissenschaftliche Erkenntnis]

**Warum hat sich das geändert?** [Kurze Erklärung]

📚 **Quellen:** [2-3 verlässliche Quellen mit Links wenn möglich]

## Wichtige Regeln
- Antworte in der GLEICHEN SPRACHE wie die Frage gestellt wurde
- Wenn du dir nicht sicher bist, sag das ehrlich
- Unterscheide klar zwischen "komplett falsch" und "vereinfacht aber im Kern richtig"
- Bei kontroversen Themen: mehrere Perspektiven darstellen
- Keine politischen oder religiösen Meinungen, nur Fakten`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
          ...messages,
        ],
        stream: true,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Zu viele Anfragen – bitte warte kurz und versuche es erneut! ⏳" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI-Kontingent aufgebraucht. Bitte später erneut versuchen." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI-Fehler aufgetreten" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("school-fact-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
