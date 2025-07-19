import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuickFactRequest {
  country: string;
  graduationYear: number;
}

async function generateQuickFunFact(country: string, year: number): Promise<string> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

  const prompt = `Generate a single interesting and fun historical fact about ${country} in the year ${year}. Keep it concise (1-2 sentences), engaging, and historically accurate. Focus on unique events, cultural moments, achievements, or interesting happenings from that specific year in that country.`;

  const makeOpenAIRequest = async () => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a historian who generates interesting and accurate historical facts.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  };

  const makeGeminiRequest = async () => {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 150,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
  };

  // Try OpenAI first, fall back to Gemini
  try {
    return await makeOpenAIRequest();
  } catch (openAIError) {
    console.log('OpenAI failed for fun fact, trying Gemini:', openAIError.message);
    try {
      return await makeGeminiRequest();
    } catch (geminiError) {
      console.error('Both AI providers failed for fun fact');
      // Return a generic fun fact as fallback
      return `${year} was an interesting year in ${country}'s history!`;
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { country, graduationYear }: QuickFactRequest = await req.json();
    
    console.log(`Generating quick fun fact for ${country} ${graduationYear}`);

    const quickFunFact = await generateQuickFunFact(country, graduationYear);
    
    console.log(`Generated quick fun fact: ${quickFunFact}`);

    return new Response(JSON.stringify({ 
      quickFunFact
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in quick-fun-fact function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate quick fun fact',
        details: error.message,
        timestamp: new Date().toISOString()
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});