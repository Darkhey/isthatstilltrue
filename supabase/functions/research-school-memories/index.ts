import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function cleanJsonResponse(jsonString: string): string {
  let s = jsonString.trim();
  if (s.startsWith('```json')) s = s.slice(7);
  else if (s.startsWith('```')) s = s.slice(3);
  if (s.endsWith('```')) s = s.slice(0, -3);
  s = s.trim();
  const firstBrace = s.indexOf('[');
  const firstCurly = s.indexOf('{');
  if (firstBrace !== -1 || firstCurly !== -1) {
    const startIndex = firstBrace !== -1 && firstCurly !== -1
      ? Math.min(firstBrace, firstCurly)
      : Math.max(firstBrace, firstCurly);
    s = s.substring(startIndex);
  }
  return s.trim();
}

// Fetch Wikipedia article extract and thumbnail by title
async function fetchWikipediaArticle(title: string, lang = 'en'): Promise<{ extract: string; url: string; thumbnail?: string } | null> {
  try {
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=extracts|pageimages&exintro=1&explaintext=1&pithumbsize=800&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return null;
    const pageId = Object.keys(pages)[0];
    if (pageId === '-1') return null;
    return {
      extract: pages[pageId].extract || '',
      url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
      thumbnail: pages[pageId].thumbnail?.source || undefined,
    };
  } catch { return null; }
}

// Search Wikipedia for articles matching a query
async function searchWikipedia(query: string, lang = 'en', limit = 5): Promise<Array<{ title: string; snippet: string; url: string }>> {
  try {
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${limit}&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.query?.search || []).map((r: any) => ({
      title: r.title,
      snippet: r.snippet.replace(/<[^>]*>/g, ''),
      url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, '_'))}`,
    }));
  } catch { return []; }
}

// Gather real research data from Wikipedia
async function gatherWikipediaResearch(schoolName: string, city: string, graduationYear: number, country: string) {
  console.log('Gathering Wikipedia research...');

  const langMap: Record<string, string> = {
    'Germany': 'de', 'Austria': 'de', 'Switzerland': 'de',
    'France': 'fr', 'Spain': 'es', 'Italy': 'it', 'Netherlands': 'nl',
  };
  const lang = langMap[country] || 'en';

  const [
    schoolSearchEn,
    schoolSearchLang,
    cityYearArticle,
    yearArticle,
    cityArticle,
  ] = await Promise.all([
    searchWikipedia(`${schoolName} ${city}`, 'en', 5),
    lang !== 'en' ? searchWikipedia(`${schoolName} ${city}`, lang, 5) : Promise.resolve([]),
    fetchWikipediaArticle(`${graduationYear} in ${city}`),
    fetchWikipediaArticle(`${graduationYear}`),
    fetchWikipediaArticle(city),
  ]);

  let schoolArticle = null;
  const allSchoolResults = [...schoolSearchEn, ...schoolSearchLang];
  for (const result of allSchoolResults.slice(0, 3)) {
    const article = await fetchWikipediaArticle(result.title, result.url.includes('de.wikipedia') ? 'de' : 'en');
    if (article && article.extract.length > 50) {
      schoolArticle = { ...article, title: result.title };
      break;
    }
  }

  const countryYearArticle = await fetchWikipediaArticle(`${graduationYear} in ${country}`);

  const sources: Array<{ title: string; url: string; content: string; type: string }> = [];

  if (schoolArticle) {
    sources.push({ title: `${schoolArticle.title} - Wikipedia`, url: schoolArticle.url, content: schoolArticle.extract.substring(0, 1500), type: 'school' });
  }
  if (cityArticle) {
    sources.push({ title: `${city} - Wikipedia`, url: cityArticle.url, content: cityArticle.extract.substring(0, 1000), type: 'city' });
  }
  if (cityYearArticle) {
    sources.push({ title: `${graduationYear} in ${city} - Wikipedia`, url: cityYearArticle.url, content: cityYearArticle.extract.substring(0, 1000), type: 'city_year' });
  }
  if (countryYearArticle) {
    sources.push({ title: `${graduationYear} in ${country} - Wikipedia`, url: countryYearArticle.url, content: countryYearArticle.extract.substring(0, 1000), type: 'country_year' });
  }
  if (yearArticle) {
    sources.push({ title: `${graduationYear} - Wikipedia`, url: yearArticle.url, content: yearArticle.extract.substring(0, 1000), type: 'year' });
  }

  for (const result of allSchoolResults.slice(0, 3)) {
    if (!sources.find(s => s.url === result.url)) {
      sources.push({ title: result.title, url: result.url, content: result.snippet, type: 'search' });
    }
  }

  // Collect best thumbnail: prefer school, then city, then country year
  const thumbnail = schoolArticle?.thumbnail || cityArticle?.thumbnail || countryYearArticle?.thumbnail || null;

  console.log(`Gathered ${sources.length} Wikipedia sources, thumbnail: ${thumbnail ? 'yes' : 'no'}`);
  return { sources, thumbnail };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { schoolName, city, graduationYear, country } = await req.json();

    if (!schoolName || !city || !graduationYear || !country) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Research: ${schoolName}, ${city}, ${graduationYear}, ${country}`);

    // Phase 1: Gather real Wikipedia research
    const { sources, thumbnail } = await gatherWikipediaResearch(schoolName, city, graduationYear, country);

    // Phase 2: Build context from real sources
    const sourcesContext = sources.map(s =>
      `[${s.type.toUpperCase()}] ${s.title}\nURL: ${s.url}\nContent: ${s.content}\n`
    ).join('\n---\n');

    // Phase 3: Use AI to synthesize memories from real sources
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not set');

    const systemPrompt = `You are an expert researcher creating school memories based ONLY on verified Wikipedia sources provided below.

CRITICAL RULES:
1. Every item MUST reference one of the provided Wikipedia sources with its exact URL
2. Do NOT invent or fabricate any sources or URLs
3. If a source doesn't exist for something, DO NOT include it
4. For nostalgia items, you may create relatable memories typical for schools in ${country} during ${graduationYear}, but mark them clearly without sourceUrl
5. Focus on factual, verifiable information from the provided sources

Available Wikipedia sources:
${sourcesContext || 'No specific sources found. Create general memories based on well-known facts about schools in ' + country + ' during ' + graduationYear + '.'}

Return ONLY valid JSON (no markdown) with this structure:
{
  "whatHappenedAtSchool": [
    {
      "title": "Event title",
      "description": "Description based on Wikipedia source",
      "category": "facilities|academics|sports|culture|technology",
      "sourceUrl": "exact Wikipedia URL from sources above or empty string",
      "sourceName": "Wikipedia article title or empty string"
    }
  ],
  "nostalgiaFactors": [
    {
      "memory": "Relatable school memory for that era",
      "shareableText": "Shareable quote",
      "sourceUrl": "Wikipedia URL if based on source, otherwise empty string",
      "sourceName": "Source name or empty string"
    }
  ],
  "localContext": [
    {
      "event": "Verified historical event from ${graduationYear}",
      "relevance": "How it affected students",
      "sourceUrl": "exact Wikipedia URL from sources above",
      "sourceName": "Wikipedia article title"
    }
  ],
  "shareableQuotes": ["Quotes reflecting the era"]
}`;

    const userPrompt = `Create engaging, evidence-based school memories for "${schoolName}" in ${city}, ${country}, graduation year ${graduationYear}. Use ONLY the Wikipedia sources provided in the system prompt.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI error:', aiResponse.status, errText);
      return new Response(JSON.stringify({ error: 'AI processing failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;
    if (!aiContent) {
      return new Response(JSON.stringify({ error: 'No AI content' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let memories;
    try {
      memories = JSON.parse(cleanJsonResponse(aiContent));
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, 'Raw:', aiContent.substring(0, 500));
      memories = {
        whatHappenedAtSchool: [],
        nostalgiaFactors: [],
        localContext: [],
        shareableQuotes: [`Class of ${graduationYear} at ${schoolName} in ${city}!`],
      };
    }
    console.log('Generated memories with', sources.length, 'real sources');

    // Build shareable content
    const shareableContent = {
      mainShare: `🎓 ${schoolName} in ${city} - Class of ${graduationYear}! Here's what was happening back then...`,
      whatsappShare: `Hey! Check out what was going on at ${schoolName} when we graduated in ${graduationYear}! 🎓✨`,
      instagramStory: `Class of ${graduationYear} 🎓 | ${schoolName} | ${city}`,
      twitterPost: `Throwback to ${graduationYear} at ${schoolName} in ${city}! 🎓 Here's what was really going on... #ClassOf${graduationYear} #SchoolMemories`,
      variants: [
        `Remember ${schoolName}? Here's what was happening in ${graduationYear}! 🎓`,
        `Class of ${graduationYear} at ${schoolName} - the memories! ✨`,
      ],
    };

    // Wrap response to match frontend expectations
    const response = {
      schoolMemories: memories,
      shareableContent,
      historicalHeadlines: (memories.localContext || []).map((ctx: any) => ({
        title: ctx.event,
        date: String(graduationYear),
        description: ctx.relevance,
        category: 'local' as const,
        source: ctx.sourceUrl || undefined,
      })),
      wikipediaSources: sources.map(s => ({ title: s.title, url: s.url, type: s.type })),
    };

    return new Response(JSON.stringify(response), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('Error:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
