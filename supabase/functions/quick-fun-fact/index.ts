
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Wikipedia snippet fetch for quick validation
async function getQuickWikipediaSnippet(topic: string): Promise<string> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&origin=*&srlimit=1`;
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(3000) });
    const searchData = await searchRes.json();
    
    if (searchData.query?.search?.[0]) {
      return searchData.query.search[0].snippet.replace(/<[^>]*>/g, '').substring(0, 200);
    }
  } catch (err) {
    console.log('Wikipedia snippet fetch failed:', err);
  }
  return '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { country, graduationYear, language = 'en' } = await req.json();
    
    if (!country || !graduationYear) {
      return new Response(
        JSON.stringify({ error: 'Country and graduation year are required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Quick Wikipedia context
    const wikiSnippet = await getQuickWikipediaSnippet(`${country} education ${graduationYear}`);
    
    const factType = getFactGenerationType(graduationYear);
    const languageInstruction = language === 'de' ? 'Respond in German.' : 'Respond in English.';
    
    let prompt = '';
    if (factType === 'modern') {
      prompt = `${languageInstruction}

Wikipedia context: ${wikiSnippet}

Generate ONE quick, verifiable fact about education in ${country} around ${graduationYear}. Use documented information only.

Format: "In ${graduationYear}, ${country} students were taught that [specific educational fact based on real curriculum]."

Keep it 1-2 sentences, specific, and verifiable. Focus on real educational practices.`;
    } else if (factType === 'historical') {
      prompt = `${languageInstruction}

Wikipedia context: ${wikiSnippet}

Generate ONE quick, verifiable historical fact about education in ${country} around ${graduationYear}.

Format: "In ${graduationYear}, educated people in ${country} learned that [specific historical belief]."

Keep it 1-2 sentences and based on documented history.`;
    } else {
      prompt = `${languageInstruction}

Generate ONE quick historical fact about knowledge in ${country} around ${graduationYear}.

Format: "In ${graduationYear}, people in ${country} believed that [documented historical worldview]."

Keep it 1-2 sentences and historically accurate.`;
    }

    console.log(`Generating RAG-based quick fact for ${country} ${graduationYear}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an educational historian. Generate only verifiable, documented facts. Keep responses concise.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2, // LOW for accuracy
        max_tokens: 150,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`Lovable AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const quickFunFact = data.choices?.[0]?.message?.content;
    
    if (!quickFunFact) {
      throw new Error('No quick fun fact generated');
    }

    console.log('Generated RAG-based fact:', quickFunFact.substring(0, 100) + '...');

    return new Response(JSON.stringify({
      quickFunFact: quickFunFact.trim()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in quick-fun-fact function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function getFactGenerationType(year: number): 'modern' | 'historical' | 'ancient' {
  if (year >= 1900) return 'modern';
  if (year >= 1800) return 'historical';
  return 'ancient';
}
