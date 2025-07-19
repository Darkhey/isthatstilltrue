
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

// Retry function with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      console.log(`Attempt ${attempt + 1} failed:`, error.message);
      
      if (attempt === maxRetries - 1) {
        throw error;
      }
      
      // Check if it's a rate limit error
      if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.log(`Rate limited, waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // For other errors, wait a shorter time
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }
  throw new Error('Max retries exceeded');
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
    const prompt = `You are a sarcastic historian who loves to mock outdated beliefs. Generate EXACTLY 8 mind-blowing facts about what people WRONGLY believed in ${country} around ${graduationYear} vs what we know now in ${currentYear}.

TONE: Be playful and mocking, but educational. Use phrases like:
- "In ${graduationYear}, people would actually think that..."
- "Feeling stupid for learning that bullshit?"
- "Your teachers were so wrong about this..."
- "Imagine being that naive..."

CATEGORIES (use exactly these):
1. Science
2. Technology  
3. Medicine
4. Society
5. Laws
6. Environment
7. Physics
8. Culture

FOCUS ON:
- Rapidly changing fields that would shock people from ${graduationYear}
- Things that seemed "settled science" but were completely wrong
- Social norms that now seem absurd
- Laws that have dramatically changed
- Technology misconceptions
- Medical practices that are now considered dangerous

For each fact:
- Start the "fact" with mocking language about ${graduationYear}
- Make the "correction" detailed and specific
- Include "mindBlowingFactor" with sarcastic commentary
- Add real source URLs when possible

Response format (JSON only):
[
  {
    "category": "Science",
    "fact": "In ${graduationYear}, people in ${country} would actually think that [outdated belief with mocking tone]",
    "correction": "Today we know that [detailed current understanding with specific facts and numbers]",
    "yearDebunked": [year between ${graduationYear} and ${currentYear}],
    "mindBlowingFactor": "Feeling stupid for learning that bullshit? [sarcastic explanation of why this change is shocking]",
    "sourceUrl": "https://credible-source.com",
    "sourceName": "Scientific Journal/Institution Name"
  }
]

Generate exactly 8 facts, one per category. Make them genuinely surprising and educational while maintaining the playful, mocking tone.`;

    const makeGeminiRequest = async () => {
      console.log('Making Gemini API request...');
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
            maxOutputTokens: 4096,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH", 
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_ONLY_HIGH"
            }
          ]
        })
      });

      console.log(`Gemini API response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API error details:`, errorText);
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      return response;
    };

    const response = await retryWithBackoff(makeGeminiRequest, 3, 2000);
    const data = await response.json();
    
    console.log('Raw Gemini response structure:', JSON.stringify(data, null, 2));

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Unexpected Gemini response structure:', data);
      throw new Error('Invalid response structure from Gemini API');
    }

    const generatedText = data.candidates[0].content.parts[0].text;
    console.log('Generated text:', generatedText);

    // Extract JSON from the response with better error handling
    let jsonMatch = generatedText.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      // Try to find JSON in code blocks
      jsonMatch = generatedText.match(/```json\s*(\[[\s\S]*?\])\s*```/);
      if (jsonMatch) {
        jsonMatch[0] = jsonMatch[1];
      }
    }
    
    if (!jsonMatch) {
      console.error('Could not extract JSON from response:', generatedText);
      throw new Error('Could not extract valid JSON from Gemini response');
    }

    let facts: OutdatedFact[];
    try {
      facts = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Attempted to parse:', jsonMatch[0]);
      throw new Error('Failed to parse JSON response from Gemini');
    }

    // Validate that we have exactly 8 facts
    if (!Array.isArray(facts) || facts.length !== 8) {
      console.error(`Expected 8 facts, got ${facts?.length || 0}:`, facts);
      throw new Error(`Expected 8 facts, got ${facts?.length || 0}`);
    }

    // Validate fact structure
    for (let i = 0; i < facts.length; i++) {
      const fact = facts[i];
      if (!fact.category || !fact.fact || !fact.correction || !fact.yearDebunked || !fact.mindBlowingFactor) {
        console.error(`Fact ${i} is missing required fields:`, fact);
        throw new Error(`Fact ${i} is missing required fields`);
      }
    }

    console.log(`Successfully generated ${facts.length} facts`);

    return new Response(JSON.stringify({ facts }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-facts function:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to generate facts';
    if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      errorMessage = 'API rate limit exceeded. Please try again in a moment.';
    } else if (error.message?.includes('API key')) {
      errorMessage = 'API configuration error. Please check the setup.';
    } else if (error.message?.includes('JSON')) {
      errorMessage = 'Failed to process the generated content. Please try again.';
    }

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
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
