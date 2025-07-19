import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateFactsRequest {
  country: string;
  graduationYear: number;
}

interface OutdatedFact {
  category: string;
  fact: string;
  correction: string;
  yearDebunked: number;
  mindBlowingFactor: string;
  sourceUrl?: string;
  sourceName?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { country, graduationYear }: GenerateFactsRequest = await req.json();
    
    console.log(`Generating facts for country: ${country}, graduation year: ${graduationYear}`);

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const currentYear = new Date().getFullYear();
    const prompt = `You are an expert historian and researcher specializing in how knowledge, laws, social norms, and scientific understanding have evolved over time. 

Generate EXACTLY 8 comprehensive and mind-blowing comparisons between what students in ${country} learned around ${graduationYear} versus what we know today in ${currentYear}.

FOCUS ON:
- Rapidly changing fields (technology, medicine, physics, space science)
- Social norms and cultural shifts that would shock someone from ${graduationYear}
- Laws and legal frameworks that have dramatically changed
- Scientific discoveries that completely revolutionized understanding
- Environmental and climate knowledge evolution
- Medical/health misconceptions vs modern understanding

Context:
- Country: ${country}
- Graduation year: ${graduationYear}
- Current year: ${currentYear}
- Consider the specific education system, culture, and legal framework of ${country}

Categories (use EXACTLY these designations):
1. Science
2. Technology  
3. Medicine
4. Society
5. Laws
6. Environment
7. Physics
8. Culture

For each fact, provide:
- The outdated belief/knowledge from that era
- The current understanding (be specific and detailed)
- Why this change is mind-blowing or shocking
- Credible source links when possible

Respond EXCLUSIVELY in the following JSON format:

[
  {
    "category": "Science",
    "fact": "Detailed description of what was believed/taught in ${graduationYear}",
    "correction": "Comprehensive explanation of current understanding with specific details and numbers",
    "yearDebunked": Year_when_this_changed,
    "mindBlowingFactor": "Explain why this change is shocking, funny, or mind-blowing",
    "sourceUrl": "https://credible-source-url.com",
    "sourceName": "Name of the source (Scientific journal, institution, etc.)"
  }
]

Requirements:
- EXACTLY 8 facts (one per category)
- Each fact must be genuinely surprising or mind-blowing
- Include specific numbers, dates, and details where possible
- Focus on things that would absolutely shock someone from ${graduationYear}
- yearDebunked must be between ${graduationYear} and ${currentYear}
- Provide real, credible source URLs when possible
- Make it educational but entertaining
- Consider ${country}-specific context (laws, culture, education system)`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${geminiApiKey}`, {
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
          maxOutputTokens: 4096,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.candidates[0].content.parts[0].text;
    
    console.log('Raw Gemini response:', generatedText);

    // Extract JSON from the response
    const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from Gemini response');
    }

    const facts: OutdatedFact[] = JSON.parse(jsonMatch[0]);

    // Validate that we have exactly 8 facts
    if (facts.length !== 8) {
      throw new Error(`Expected 8 facts, got ${facts.length}`);
    }

    console.log(`Successfully generated ${facts.length} facts`);

    return new Response(JSON.stringify({ facts }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-facts function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to generate facts using Gemini API'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});