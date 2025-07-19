import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

interface FactCheckResult {
  isStillValid: boolean;
  originalStatement: string;
  correction?: string;
  yearDebunked?: number;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
  sources?: string[];
}

serve(async (req) => {
  console.log('Processing fact check request...');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { statement } = await req.json();
    
    if (!statement || typeof statement !== 'string') {
      throw new Error('Statement is required and must be a string');
    }

    console.log(`Checking fact: "${statement}"`);

    const systemPrompt = `You are an expert fact-checker who analyzes statements to determine if they are still scientifically, historically, or generally accurate based on current knowledge.

Your task is to:
1. Analyze the given statement for factual accuracy
2. Determine if it's still valid or has been proven wrong/outdated
3. If it's outdated, provide the correct information and approximate year it was debunked
4. Provide a clear explanation of why it changed
5. Rate your confidence level in the assessment

Return your response as a JSON object with this exact structure:
{
  "isStillValid": boolean,
  "originalStatement": "the original statement",
  "correction": "corrected information (only if isStillValid is false)",
  "yearDebunked": number (only if isStillValid is false, approximate year),
  "explanation": "detailed explanation of why the statement is valid/invalid and what changed",
  "confidence": "high" | "medium" | "low",
  "sources": ["relevant source names if available"]
}

Examples:
- "The atom is the smallest unit of matter" → outdated (subatomic particles discovered)
- "The Earth is round" → still valid
- "Pluto is the 9th planet" → outdated (reclassified in 2006)
- "Blood is blue before it touches oxygen" → was never true (common misconception)

Be thorough but concise. Focus on major scientific, historical, or factual changes rather than minor details.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please fact-check this statement: "${statement}"` }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('Raw AI response:', aiResponse);

    // Parse the JSON response from AI
    let factCheckResult: FactCheckResult;
    try {
      factCheckResult = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('AI response was:', aiResponse);
      
      // Fallback: create a structured response
      factCheckResult = {
        isStillValid: true,
        originalStatement: statement,
        explanation: "Unable to determine accuracy due to parsing error. Please try again.",
        confidence: 'low'
      };
    }

    // Validate the response structure
    if (typeof factCheckResult.isStillValid !== 'boolean') {
      throw new Error('Invalid response structure from AI');
    }

    console.log('Fact check result:', factCheckResult);

    return new Response(JSON.stringify(factCheckResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fact check function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        isStillValid: true,
        originalStatement: '',
        explanation: 'An error occurred while checking this fact. Please try again.',
        confidence: 'low'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});