
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { country, graduationYear } = await req.json();
    
    if (!country || !graduationYear) {
      return new Response(
        JSON.stringify({ error: 'Country and graduation year are required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const factType = getFactGenerationType(graduationYear);
    
    let prompt = '';
    if (factType === 'modern') {
      prompt = `Generate a quick, interesting historical fact about education or daily life in ${country} around ${graduationYear}. Focus on what was actually taught in schools or commonly believed at that time. Keep it concise (1-2 sentences) and educational. Make it specifically about the educational system or curriculum of that era.

Example format: "In ${graduationYear}, ${country} students were commonly taught that [educational fact], which was the standard understanding before [later development]."

Make it engaging and specific to ${country}'s educational context in ${graduationYear}.`;
    } else if (factType === 'historical') {
      prompt = `Generate a quick, interesting fact about education or knowledge in ${country} around ${graduationYear}. Focus on what educated people learned or believed during that historical period. Keep it concise (1-2 sentences) and educational.

Example format: "In ${graduationYear}, educated people in ${country} commonly learned that [historical belief], reflecting the educational standards of that era."

Make it engaging and specific to ${country}'s educational/intellectual context in ${graduationYear}.`;
    } else {
      prompt = `Generate a quick, interesting fact about worldviews or knowledge in ${country} around ${graduationYear}. Focus on what people believed or understood during that ancient/medieval period. Keep it concise (1-2 sentences) and educational.

Example format: "In ${graduationYear}, people in ${country} believed that [ancient worldview], which was the prevailing understanding of that time."

Make it engaging and specific to ${country}'s cultural/intellectual context in ${graduationYear}.`;
    }

    console.log(`Generating quick fun fact for ${country} ${graduationYear}`);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.9,
          maxOutputTokens: 200,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API request failed: ${response.status}`);
    }

    const data = await response.json();
    const quickFunFact = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!quickFunFact) {
      throw new Error('No quick fun fact generated');
    }

    console.log('Generated quick fun fact:', quickFunFact.substring(0, 100) + '...');

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
