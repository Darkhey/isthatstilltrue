import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface FactCheckResult {
  isStillValid: boolean;
  originalStatement: string;
  correction?: string;
  yearDebunked?: number;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
  sources?: Array<{
    title: string;
    url: string;
  }>;
}

// Helper function to validate and extract URLs from text
function extractValidUrls(text: string): Array<{title: string, url: string}> {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
  const urls = text.match(urlRegex) || [];
  
  return urls
    .filter(url => {
      // Only accept trusted educational sources
      return url.includes('wikipedia.org') ||
             url.includes('britannica.com') ||
             url.includes('.edu') ||
             url.includes('.gov') ||
             url.includes('jstor.org') ||
             url.includes('science.org') ||
             url.includes('nature.com') ||
             url.includes('scholar.google.com');
    })
    .map(url => ({
      title: new URL(url).hostname.replace('www.', ''),
      url: url
    }));
}

serve(async (req) => {
  console.log('Processing fact check request...');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { statement } = await req.json();
    
    // Validate input
    if (!statement || typeof statement !== 'string') {
      throw new Error('Statement is required and must be a string');
    }

    const trimmedStatement = statement.trim();
    
    // Check minimum length
    if (trimmedStatement.length < 10) {
      throw new Error('Statement is too short. Please provide a complete statement to check.');
    }

    // Check maximum length
    if (trimmedStatement.length > 1000) {
      throw new Error('Statement is too long. Please keep it under 1000 characters.');
    }

    console.log(`Checking fact: "${trimmedStatement}"`);

    const systemPrompt = `You are an expert fact-checker who analyzes statements to determine if they are still scientifically, historically, or generally accurate based on current knowledge.

CRITICAL RULES:
1. You MUST provide real, verifiable sources with FULL URLs from trusted educational platforms
2. ONLY use sources from: Wikipedia, Britannica, .edu domains, .gov domains, JSTOR, Nature, Science.org, or Google Scholar
3. Include at least 2 sources with complete URLs in your explanation text
4. Never invent or make up information
5. If you cannot verify the fact with reliable sources, set confidence to "low"

Your task:
1. Analyze the statement for factual accuracy using current knowledge
2. Determine if it's still valid or has been proven wrong/outdated
3. If outdated, provide the correct information and year it was debunked
4. Provide a detailed explanation citing specific sources with URLs
5. Rate your confidence level (high only if you have multiple reliable sources)

Return ONLY a valid JSON object with this exact structure:
{
  "isStillValid": boolean,
  "originalStatement": "the original statement",
  "correction": "corrected information (only if isStillValid is false)",
  "yearDebunked": number (only if isStillValid is false, approximate year),
  "explanation": "detailed explanation citing sources with FULL URLs (e.g., https://en.wikipedia.org/wiki/Article_Name)",
  "confidence": "high" | "medium" | "low"
}

Examples of good explanations with sources:
- "According to https://en.wikipedia.org/wiki/Atom, atoms are not the smallest particles. Subatomic particles like protons, neutrons, and electrons were discovered in the early 20th century. This is confirmed by https://www.britannica.com/science/subatomic-particle"

Be thorough and always include clickable source URLs in the explanation.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please fact-check this statement and provide reliable sources with full URLs: "${trimmedStatement}"` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (response.status === 402) {
        throw new Error('AI credits exhausted. Please add credits to continue.');
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('Raw AI response:', aiResponse);

    // Parse the JSON response from AI
    let factCheckResult: FactCheckResult;
    try {
      // Try to extract JSON from markdown code blocks if present
      let jsonText = aiResponse;
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      } else {
        // Try to find JSON object in the text
        const jsonObjectMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
          jsonText = jsonObjectMatch[0];
        }
      }
      
      factCheckResult = JSON.parse(jsonText);
      
      // Extract URLs from explanation and add to sources
      const extractedSources = extractValidUrls(factCheckResult.explanation);
      if (extractedSources.length > 0) {
        factCheckResult.sources = extractedSources;
        console.log(`Extracted ${extractedSources.length} valid source(s)`);
      } else {
        console.warn('No valid educational sources found in response');
        factCheckResult.confidence = 'low'; // Downgrade confidence if no sources
      }
      
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('AI response was:', aiResponse);
      
      // Fallback: create a structured response
      factCheckResult = {
        isStillValid: true,
        originalStatement: trimmedStatement,
        explanation: "Unable to verify this statement due to a technical issue. Please try again.",
        confidence: 'low',
        sources: []
      };
    }

    // Validate the response structure
    if (typeof factCheckResult.isStillValid !== 'boolean') {
      console.error('Invalid response structure - isStillValid is not a boolean');
      throw new Error('Invalid response structure from AI');
    }

    // Ensure originalStatement is set
    if (!factCheckResult.originalStatement) {
      factCheckResult.originalStatement = trimmedStatement;
    }

    console.log('Fact check result:', {
      isStillValid: factCheckResult.isStillValid,
      confidence: factCheckResult.confidence,
      sourcesCount: factCheckResult.sources?.length || 0
    });

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