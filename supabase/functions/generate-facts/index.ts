
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

interface HistoricalFact {
  subject: string;
  whatWasTaught: string;
  currentUnderstanding: string;
  yearDebunked: number;
  significance: string;
  sourceUrl?: string;
  sourceName?: string;
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

// Step 1: Generate historical curriculum
async function generateHistoricalCurriculum(country: string, year: number): Promise<string> {
  const prompt = `You are an educational historian with access to historical school curricula from ${country}.

Your task is to simulate what a typical student in ${country} in the year ${year} would have learned in school across major subjects.

Focus on facts and concepts that were commonly taught and accepted as truth at the time, using the exact terminology and assumptions typical of that era.

Generate exactly 8 statements organized by subject areas. Each statement should represent what was genuinely taught in ${country} schools around ${year}.

Subject areas to cover:
1. Science (Biology, Chemistry, Physics)
2. Technology (Computing, Engineering predictions)
3. Medicine (Health education, medical facts)
4. Society (Social studies, demographics)
5. Laws (Civics, government)
6. Environment (Environmental science, climate)
7. Physics (Physics models and theories)
8. Culture (Literature, arts, global perspectives)

For each statement, use language authentic to the ${year} era textbooks and teaching materials common in ${country}.

Return ONLY a JSON array in this exact format:
[
  {
    "subject": "Science",
    "statement": "In ${year}, students in ${country} were taught that [exact teaching from that era]",
    "context": "This was based on [reasoning/evidence available at the time]"
  }
]`;

  return await makeAIRequest(prompt);
}

// Step 2: Evaluate with modern knowledge
async function evaluateWithModernKnowledge(historicalStatements: string, country: string, year: number): Promise<OutdatedFact[]> {
  const currentYear = new Date().getFullYear();
  
  const prompt = `You are a science communicator analyzing historical curriculum. You have been given statements that were actually taught in ${country} schools around ${year}.

Your task is to evaluate each statement against current scientific understanding as of ${currentYear} and determine which ones are now outdated or disproven.

For each statement that is now considered outdated or incorrect, create a detailed analysis in the specified format.

Historical curriculum from ${year}:
${historicalStatements}

For each outdated statement, provide:
- A playful, educational tone acknowledging how knowledge has evolved
- Detailed current scientific consensus with specific evidence and breakthroughs
- The approximate year when this understanding changed
- Why this change is significant for our understanding
- Credible sources when possible

Return ONLY a valid JSON array of outdated facts (skip any that are still accurate):

[
  {
    "category": "[Subject area]",
    "fact": "In ${year}, ${country} students were confidently taught that [exact historical teaching]",
    "correction": "Today we know that [detailed current understanding with specific evidence, studies, timeline of how understanding evolved - 4-6 sentences]",
    "yearDebunked": [year when understanding changed],
    "mindBlowingFactor": "It's amazing how [3-4 sentences about significance of this change and what it reveals about scientific progress]",
    "sourceUrl": "https://credible-source.com",
    "sourceName": "Research Institution/Study Name"
  }
]`;

  const response = await makeAIRequest(prompt);
  
  // Parse and validate the response
  let facts: OutdatedFact[];
  try {
    const extractedText = extractJSONFromResponse(response);
    facts = JSON.parse(extractedText);
  } catch (parseError) {
    console.error('JSON parsing error:', parseError);
    throw new Error('Failed to parse JSON response from AI');
  }

  // Validate fact structure
  if (!Array.isArray(facts)) {
    throw new Error('Response is not an array');
  }

  for (let i = 0; i < facts.length; i++) {
    const fact = facts[i];
    if (!fact.category || !fact.fact || !fact.correction || !fact.yearDebunked || !fact.mindBlowingFactor) {
      console.error(`Fact ${i} is missing required fields:`, fact);
      throw new Error(`Fact ${i} is missing required fields`);
    }
  }

  return facts;
}

// Helper function to make AI requests with fallback
async function makeAIRequest(prompt: string): Promise<string> {
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
  try {
    return await retryWithBackoff(makeOpenAIRequest, 3, 2000);
  } catch (openAIError) {
    console.log('OpenAI failed, trying Gemini fallback:', openAIError.message);
    try {
      return await retryWithBackoff(makeGeminiRequest, 3, 2000);
    } catch (geminiError) {
      console.error('Both OpenAI and Gemini failed:', { openAIError: openAIError.message, geminiError: geminiError.message });
      throw new Error('Both AI providers failed to generate facts');
    }
  }
}

// Helper function to extract JSON from AI response
function extractJSONFromResponse(generatedText: string): string {
  let extractedText = generatedText.trim();
  
  // Method 1: Direct array extraction
  let arrayMatch = extractedText.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return arrayMatch[0];
  }
  
  // Method 2: Extract from code blocks
  const codeBlockMatch = extractedText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1];
  }
  
  // Method 3: Find array boundaries manually
  const startIndex = extractedText.indexOf('[');
  const lastIndex = extractedText.lastIndexOf(']');
  if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
    return extractedText.substring(startIndex, lastIndex + 1);
  }
  
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

    console.log(`Generating new facts using two-step process for ${country} ${graduationYear}`);

    // Step 1: Generate historical curriculum
    console.log('Step 1: Generating historical curriculum...');
    const historicalCurriculum = await generateHistoricalCurriculum(country, graduationYear);
    console.log('Historical curriculum generated successfully');

    // Step 2: Evaluate with modern knowledge
    console.log('Step 2: Evaluating with modern knowledge...');
    const facts = await evaluateWithModernKnowledge(historicalCurriculum, country, graduationYear);
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
