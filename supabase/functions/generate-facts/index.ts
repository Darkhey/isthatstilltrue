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
    
    console.log(`Checking cache for country: ${country}, graduation year: ${graduationYear}`);

    // Check for cached facts first
    const { data: cachedData, error: cacheError } = await supabase
      .from('cached_facts')
      .select('facts_data, created_at')
      .eq('country', country)
      .eq('graduation_year', graduationYear)
      .single();

    if (cacheError && cacheError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Cache lookup error:', cacheError);
    }

    // Return cached facts if they exist and are recent (within 6 months)
    if (cachedData) {
      const cacheAge = Date.now() - new Date(cachedData.created_at).getTime();
      const sixMonthsInMs = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months in milliseconds
      
      if (cacheAge < sixMonthsInMs) {
        console.log(`Returning cached facts for ${country} ${graduationYear} (cached ${Math.round(cacheAge / (24 * 60 * 60 * 1000))} days ago)`);
        return new Response(JSON.stringify({ 
          facts: cachedData.facts_data,
          cached: true,
          cacheAge: Math.round(cacheAge / (24 * 60 * 60 * 1000))
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        console.log(`Cache expired for ${country} ${graduationYear}, generating new facts`);
      }
    } else {
      console.log(`No cached facts found for ${country} ${graduationYear}, generating new facts`);
    }

    const currentYear = new Date().getFullYear();
    const prompt = `You are an educational historian with access to historical curriculum archives. Research and provide EXACTLY 8 detailed examples of outdated content that was actually taught in ${country} schools around ${graduationYear}.

RESEARCH APPROACH:
- Reference actual textbook publishers active in ${country} during ${graduationYear} (e.g., Hachette, Nathan, Bordas for France; McGraw-Hill, Pearson for USA)
- Look up official ministry of education curriculum standards from that era
- Find specific scientific consensus that existed in ${graduationYear} vs today
- Identify major discoveries/paradigm shifts that happened AFTER ${graduationYear}
- Reference specific teaching materials, exam requirements, and standard explanations from that time

COUNTRY-SPECIFIC REQUIREMENTS FOR ${country}:
- Use curriculum standards specific to ${country}'s education system circa ${graduationYear}
- Reference major textbook publishers and educational authorities from that country/era
- Include specific cultural/political context that shaped education in ${country} at that time
- Mention specific exam systems or educational frameworks that were in place

FACT LENGTH & DIVERSITY REQUIREMENTS:
- Each "fact" should be 2-3 detailed sentences explaining what was taught and why
- Each "correction" should be 4-6 sentences with specific evidence, dates, and discoveries
- Each "mindBlowingFactor" should be 3-4 sentences with context and significance
- Vary the types of misconceptions: scientific paradigm shifts, technology predictions, medical breakthroughs, social changes, legal reforms, environmental understanding, physics discoveries, cultural evolution
- Include both dramatic reversals and gradual shifts in understanding
- Mix well-known changes with surprising lesser-known updates

CATEGORIES (use exactly these):
1. Science - Biology/Chemistry/Physics textbook content from ${graduationYear}
2. Technology - Computer science predictions and tech understanding circa ${graduationYear}  
3. Medicine - Health education and medical facts taught in ${graduationYear}
4. Society - Social studies curriculum and demographic assumptions from ${graduationYear}
5. Laws - Civics/government class content reflecting ${graduationYear} legal landscape
6. Environment - Environmental science teachings and climate understanding circa ${graduationYear}
7. Physics - Physics explanations and models taught in ${graduationYear} textbooks
8. Culture - Literature/arts curriculum assumptions and canons from ${graduationYear}

TONE: Educational but with playful mockery. Use phrases like:
- "In ${graduationYear}, ${country} students were drilled to memorize as absolute scientific fact that..."
- "Your ${graduationYear} textbooks in ${country} confidently declared with zero doubt that..."
- "Teachers in ${country} around ${graduationYear} would seriously make students write essays defending the idea that..."
- "Feeling stupid for cramming that complete bullshit for your ${country} final exams?"
- "Your teachers were so laughably wrong about this that..."

For each fact, provide:
- The specific detailed claim that was taught as settled science/fact in ${graduationYear}
- The year when this understanding was proven wrong or significantly revised
- Current scientific/academic consensus with specific evidence, studies, and breakthroughs
- Real sources documenting both the historical teaching and current understanding
- Explain WHY this change is significant and what it reveals about the evolution of knowledge

CRITICAL: Return ONLY valid JSON array. No markdown, no code blocks, no extra text.

JSON format:
[
  {
    "category": "Science",
    "fact": "In ${graduationYear}, ${country} students were drilled to memorize as absolute scientific fact that [detailed 2-3 sentence explanation of what was taught and the reasoning behind it at the time]",
    "correction": "Today we know that [detailed 4-6 sentence explanation with specific evidence, breakthrough discoveries, key researchers, and timeline of how our understanding evolved]",
    "yearDebunked": [specific year between ${graduationYear} and ${currentYear}],
    "mindBlowingFactor": "Feeling stupid for cramming that complete bullshit for your ${country} final exams? [3-4 sentences explaining the broader significance of this change, what it reveals about scientific progress, and why this shift was so important for the field]",
    "sourceUrl": "https://credible-source.com",
    "sourceName": "Research Institution/Study Name"
  }
]`;

    // Try OpenAI first
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
            { role: 'system', content: 'You are an educational historian specializing in curriculum analysis. Return only valid JSON arrays with no markdown formatting.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.8,
          max_tokens: 4000
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OpenAI API error details:`, errorText);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('OpenAI API response status:', response.status);
      
      const generatedText = data.choices[0].message.content;
      console.log('Generated text:', generatedText);
      
      return generatedText;
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
            temperature: 0.8,
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
      console.log('Gemini API response status:', response.status);
      console.log('Raw Gemini response structure:', JSON.stringify(data, null, 2));
      
      const generatedText = data.candidates[0].content.parts[0].text;
      console.log('Generated text:', generatedText);
      
      return generatedText;
    };

    // Try OpenAI first, fall back to Gemini if it fails
    let generatedText;
    try {
      generatedText = await retryWithBackoff(makeOpenAIRequest, 3, 2000);
      console.log('Successfully used OpenAI');
    } catch (openAIError) {
      console.log('OpenAI failed, trying Gemini fallback:', openAIError.message);
      try {
        generatedText = await retryWithBackoff(makeGeminiRequest, 3, 2000);
        console.log('Successfully used Gemini fallback');
      } catch (geminiError) {
        console.error('Both OpenAI and Gemini failed:', { openAIError: openAIError.message, geminiError: geminiError.message });
        throw new Error('Both AI providers failed to generate facts');
      }
    }

    // Advanced JSON extraction with multiple fallback methods
    let extractedText = generatedText.trim();
    
    // Method 1: Direct array extraction
    let arrayMatch = extractedText.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      extractedText = arrayMatch[0];
    } else {
      // Method 2: Extract from code blocks
      const codeBlockMatch = extractedText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      if (codeBlockMatch) {
        extractedText = codeBlockMatch[1];
      } else {
        // Method 3: Find array boundaries manually
        const startIndex = extractedText.indexOf('[');
        const lastIndex = extractedText.lastIndexOf(']');
        if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
          extractedText = extractedText.substring(startIndex, lastIndex + 1);
        } else {
          console.error('Could not extract JSON from response:', generatedText.substring(0, 500) + '...');
          throw new Error('Could not extract valid JSON from AI response');
        }
      }
    }

    let facts: OutdatedFact[];
    try {
      facts = JSON.parse(extractedText);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Attempted to parse:', extractedText.substring(0, 1000) + '...');
      
      // Last resort: try to fix common JSON issues and parse again
      let fixedText = extractedText
        .replace(/'/g, '"')  // Replace single quotes
        .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
        .replace(/([^"\\])\n/g, '$1\\n')  // Escape unescaped newlines
        .replace(/\t/g, '\\t');  // Escape tabs
      
      try {
        facts = JSON.parse(fixedText);
        console.log('Successfully parsed after fixing JSON issues');
      } catch (secondError) {
        console.error('Second parsing attempt failed:', secondError);
        throw new Error('Failed to parse JSON response from AI');
      }
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

    // Save the generated facts to cache for future use
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
        // Don't fail the request if caching fails
      } else {
        console.log(`Successfully cached facts for ${country} ${graduationYear}`);
      }
    } catch (cacheError) {
      console.error('Cache insertion error:', cacheError);
      // Don't fail the request if caching fails
    }

    return new Response(JSON.stringify({ 
      facts,
      cached: false
    }), {
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