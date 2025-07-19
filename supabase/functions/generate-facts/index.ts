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
    const prompt = `You are an expert in education systems and scientific developments. Generate EXACTLY 6 outdated facts that students in ${country} around the year ${graduationYear} might have learned, but are now considered outdated or inaccurate.

Context:
- Country: ${country}
- Graduation year: ${graduationYear}
- Current year: ${currentYear}
- Consider the specific education system and curriculum of ${country}

Categories (use EXACTLY these English designations):
1. Biology
2. Chemistry  
3. Physics
4. History
5. Geography
6. Technology

Respond EXCLUSIVELY in the following JSON format without additional text:

[
  {
    "category": "Biology",
    "fact": "The outdated fact that was taught back then",
    "correction": "The modern, correct information",
    "yearDebunked": Year_of_correction
  },
  {
    "category": "Chemistry",
    "fact": "The outdated fact that was taught back then", 
    "correction": "The modern, correct information",
    "yearDebunked": Year_of_correction
  },
  ...
]

Important rules:
- EXACTLY 6 facts (one per category)
- Facts must be relevant for the specific country and education period
- yearDebunked must be after graduation year and before current year
- Use English language
- Be scientifically precise and educationally valuable`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`, {
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
          temperature: 0.7,
          maxOutputTokens: 2048,
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

    // Validate that we have exactly 6 facts
    if (facts.length !== 6) {
      throw new Error(`Expected 6 facts, got ${facts.length}`);
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