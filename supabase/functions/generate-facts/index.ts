
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
    const prompt = `You are a educational historian specializing in curriculum analysis. Generate EXACTLY 8 specific examples of outdated school content from ${country} in ${graduationYear}.

FOCUS ON ACTUAL SCHOOL CURRICULUM:
- What was specifically taught in ${country} textbooks around ${graduationYear}
- Official curriculum standards and common teaching materials from that era
- Specific scientific "facts" that students memorized for tests
- Standard explanations given in classrooms of that time period

TONE: Educational but with playful mockery. Use phrases like:
- "In ${graduationYear}, students in ${country} were actually taught that..."
- "Your ${graduationYear} textbooks confidently stated that..."
- "Teachers in ${country} around ${graduationYear} would seriously tell their classes that..."
- "Feeling stupid for memorizing that bullshit in school?"
- "Your teachers were so confidently wrong about this..."

SPECIFIC CATEGORIES (use exactly these):
1. Science - Biology/Chemistry textbook content
2. Technology - Computer science and tech predictions
3. Medicine - Health education and medical "facts"
4. Society - Social studies curriculum  
5. Laws - Civics/government class content
6. Environment - Environmental science teachings
7. Physics - Physics textbook explanations
8. Culture - Literature/arts curriculum assumptions

For each fact:
- Reference specific teaching methods or common textbook explanations from that era
- Include what students would have written on tests or homework
- Contrast with detailed current understanding
- Add sources when possible (research institutions, updated textbooks, etc.)

CRITICAL: Return ONLY valid JSON array. No markdown, no code blocks, no extra text.

JSON format:
[
  {
    "category": "Science",
    "fact": "In ${graduationYear}, students in ${country} were actually taught that [specific textbook claim with mocking tone]",
    "correction": "Today we know that [detailed current understanding with specific facts]",
    "yearDebunked": [specific year between ${graduationYear} and ${currentYear}],
    "mindBlowingFactor": "Feeling stupid for memorizing that bullshit in school? [explain why this change is shocking]",
    "sourceUrl": "https://credible-source.com",
    "sourceName": "Institution/Study Name"
  }
]`;

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
          throw new Error('Could not extract valid JSON from Gemini response');
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
        throw new Error('Failed to parse JSON response from Gemini');
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
