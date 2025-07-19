
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

// Initialize Supabase client for caching
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

// Generate facts directly in one step with concrete examples
async function generateOutdatedFacts(country: string, year: number): Promise<OutdatedFact[]> {
  const currentYear = new Date().getFullYear();
  
  const prompt = `You are an educational historian analyzing what students in ${country} were taught in ${year} vs what we know today in ${currentYear}.

Generate exactly 6-8 concrete, factual statements that were commonly taught in ${country} schools around ${year} but have since been proven wrong or significantly updated.

Focus on these categories where knowledge has genuinely changed:
- **Science** (biology, chemistry, physics discoveries)
- **Technology** (predictions, computer capabilities)  
- **Medicine** (health advice, medical understanding)
- **Space/Astronomy** (planetary status, universe understanding)
- **Nutrition** (dietary recommendations)
- **Environment** (climate, pollution understanding)
- **History** (recent events, Cold War aftermath)
- **Geography** (country names, political boundaries)

For each fact, provide:
1. What was definitively taught as truth in ${year}
2. What we definitively know now with specific evidence
3. When this understanding changed (approximate year)
4. Why this change matters

EXAMPLES of the format you should follow:

For USA 1995:
- "Pluto is the ninth planet in our solar system" → "Pluto was reclassified as a dwarf planet in 2006 by the International Astronomical Union"
- "Low-fat diets are the healthiest choice" → "Healthy fats are essential; ultra-processed foods and added sugars are the main dietary concerns"
- "The Internet is a research tool with limited daily relevance" → "The Internet became central to all communication, commerce, and daily life"

Return ONLY a valid JSON array with NO markdown formatting:

[
  {
    "category": "Science/Technology/Medicine/etc",
    "fact": "In ${year}, students in ${country} were taught that [specific concrete statement]",
    "correction": "Today we know that [specific updated knowledge with evidence, timeline, and scientific consensus - 3-4 sentences explaining how understanding evolved]",
    "yearDebunked": [year when understanding changed],
    "mindBlowingFactor": "This change [explain significance and what it reveals about scientific progress - 2-3 sentences]",
    "sourceUrl": "https://credible-scientific-source.com",
    "sourceName": "Scientific Institution/Study Name"
  }
]

Focus on facts that were genuinely taught as definitive truth in ${year} textbooks in ${country}, not theoretical concepts or ongoing debates.`;

  return await makeAIRequest(prompt);
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
      
      if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.log(`Rate limited, waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }
  throw new Error('Max retries exceeded');
}

// Helper function to make AI requests with fallback
async function makeAIRequest(prompt: string): Promise<OutdatedFact[]> {
  const makeOpenAIRequest = async () => {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not available');
    }

    console.log('Making OpenAI API request...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an educational historian. Return only valid JSON arrays with no markdown formatting.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error details:`, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  };

  const makeGeminiRequest = async () => {
    if (!geminiApiKey) {
      throw new Error('Gemini API key not available');
    }
    
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
          temperature: 0.7,
          maxOutputTokens: 4000,
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error details:`, errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  };

  // Try OpenAI first, fall back to Gemini
  let response: string;
  try {
    response = await retryWithBackoff(makeOpenAIRequest, 3, 2000);
  } catch (openAIError) {
    console.log('OpenAI failed, trying Gemini fallback:', openAIError.message);
    try {
      response = await retryWithBackoff(makeGeminiRequest, 3, 2000);
    } catch (geminiError) {
      console.error('Both OpenAI and Gemini failed:', { openAIError: openAIError.message, geminiError: geminiError.message });
      throw new Error('Both AI providers failed to generate facts');
    }
  }

  // Parse and validate the response
  let facts: OutdatedFact[];
  try {
    const extractedText = extractJSONFromResponse(response);
    console.log('Extracted JSON text:', extractedText);
    facts = JSON.parse(extractedText);
  } catch (parseError) {
    console.error('JSON parsing error:', parseError);
    console.error('Raw AI response:', response);
    throw new Error('Failed to parse JSON response from AI');
  }

  // Validate fact structure
  if (!Array.isArray(facts)) {
    console.error('Response is not an array:', facts);
    throw new Error('Response is not an array');
  }

  if (facts.length === 0) {
    console.error('No facts generated');
    throw new Error('No facts were generated');
  }

  for (let i = 0; i < facts.length; i++) {
    const fact = facts[i];
    if (!fact.category || !fact.fact || !fact.correction || !fact.yearDebunked || !fact.mindBlowingFactor) {
      console.error(`Fact ${i} is missing required fields:`, fact);
      throw new Error(`Fact ${i} is missing required fields`);
    }
  }

  console.log(`Successfully validated ${facts.length} facts`);
  return facts;
}

// Helper function to extract JSON from AI response
function extractJSONFromResponse(generatedText: string): string {
  let extractedText = generatedText.trim();
  
  // Remove any markdown code blocks first
  extractedText = extractedText.replace(/```json\s*/, '').replace(/```\s*$/, '');
  
  // Method 1: Direct array extraction
  let arrayMatch = extractedText.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return arrayMatch[0];
  }
  
  // Method 2: Find array boundaries manually
  const startIndex = extractedText.indexOf('[');
  const lastIndex = extractedText.lastIndexOf(']');
  if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
    return extractedText.substring(startIndex, lastIndex + 1);
  }
  
  // Method 3: Try to find JSON-like content
  const jsonMatch = extractedText.match(/(\[[\s\S]*?\])/);
  if (jsonMatch) {
    return jsonMatch[1];
  }
  
  console.error('Could not extract JSON from response:', extractedText);
  throw new Error('Could not extract valid JSON from AI response');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { country, graduationYear }: GenerateFactsRequest = await req.json();
    
    console.log(`Processing request for country: ${country}, graduation year: ${graduationYear}`);

    // Check for cached facts first
    const { data: cachedData, error: cacheError } = await supabase
      .from('cached_facts')
      .select('facts_data, created_at')
      .eq('country', country)
      .eq('graduation_year', graduationYear)
      .single();

    if (cacheError && cacheError.code !== 'PGRST116') {
      console.error('Cache lookup error:', cacheError);
    }

    // Return cached facts if they exist and are recent (within 6 months)
    if (cachedData) {
      const cacheAge = Date.now() - new Date(cachedData.created_at).getTime();
      const sixMonthsInMs = 6 * 30 * 24 * 60 * 60 * 1000;
      
      if (cacheAge < sixMonthsInMs) {
        console.log(`Returning cached facts for ${country} ${graduationYear} (cached ${Math.round(cacheAge / (24 * 60 * 60 * 1000))} days ago)`);
        return new Response(JSON.stringify({ 
          facts: cachedData.facts_data,
          cached: true,
          cacheAge: Math.round(cacheAge / (24 * 60 * 60 * 1000))
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log(`Generating new facts for ${country} ${graduationYear}`);

    // Generate facts with the new simplified approach
    const facts = await generateOutdatedFacts(country, graduationYear);
    console.log(`Successfully generated ${facts.length} outdated facts`);

    // Save the generated facts to cache
    try {
      const { error: insertError } = await supabase
        .from('cached_facts')
        .upsert({
          country,
          graduation_year: graduationYear,
          facts_data: facts,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'country,graduation_year'
        });

      if (insertError) {
        console.error('Failed to cache facts:', insertError);
      } else {
        console.log(`Successfully cached facts for ${country} ${graduationYear}`);
      }
    } catch (cacheError) {
      console.error('Cache insertion error:', cacheError);
    }

    return new Response(JSON.stringify({ 
      facts,
      cached: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-facts function:', error);
    
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
