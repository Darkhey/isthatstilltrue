
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

// Generate fact hash for tracking and quality control
function generateFactHash(fact: OutdatedFact): string {
  const factString = `${fact.category}|${fact.fact}|${fact.correction}`;
  return btoa(factString).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
}

// Filter out facts that have been reported too many times
async function filterReportedFacts(facts: OutdatedFact[], country: string, graduationYear: number): Promise<OutdatedFact[]> {
  const { data: qualityStats } = await supabase
    .from('fact_quality_stats')
    .select('fact_hash, total_reports')
    .eq('country', country)
    .eq('graduation_year', graduationYear)
    .gte('total_reports', 5);
  
  const reportedHashes = new Set((qualityStats || []).map(stat => stat.fact_hash));
  
  return facts.filter(fact => {
    const factHash = generateFactHash(fact);
    return !reportedHashes.has(factHash);
  });
}

// Update quality stats for facts
async function updateFactQualityStats(facts: OutdatedFact[], country: string, graduationYear: number): Promise<void> {
  for (const fact of facts) {
    const factHash = generateFactHash(fact);
    
    const { data: reports } = await supabase
      .from('fact_reports')
      .select('id')
      .eq('fact_hash', factHash);
    
    const reportCount = reports?.length || 0;
    
    await supabase
      .from('fact_quality_stats')
      .upsert({
        fact_hash: factHash,
        country,
        graduation_year: graduationYear,
        total_reports: reportCount,
        updated_at: new Date().toISOString(),
        ...(reportCount >= 5 && {
          auto_replaced_at: new Date().toISOString(),
          replacement_reason: `Auto-replaced due to ${reportCount} reports`
        })
      }, { onConflict: 'fact_hash' });
  }
}

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

interface EducationSystemProblem {
  problem: string;
  description: string;
  impact: string;
}

// Determine the type of fact generation based on year
function getFactGenerationType(year: number): 'modern' | 'historical' | 'ancient' {
  if (year >= 1900) return 'modern';
  if (year >= 1800) return 'historical';
  return 'ancient';
}

// Generate politics/international relations facts (prioritized)
async function generatePoliticalFacts(country: string, year: number): Promise<OutdatedFact[]> {
  const currentYear = new Date().getFullYear();
  const factType = getFactGenerationType(year);
  
  let prompt = '';
  
  if (factType === 'modern') {
    prompt = `You are an expert in international relations and political education. Analyze how students in ${country} were taught about other countries and international relations in ${year} vs today in ${currentYear}.

Generate exactly 2-3 political/international relations facts that were commonly taught in ${country} schools around ${year} but have since been proven wrong, overly simplified, or significantly updated.

Focus on these controversial/interesting areas:
- **Views on specific countries** (how ${country} students were taught to view Russia, China, USA, Middle East, etc.)
- **International conflicts** and how they were presented
- **Economic systems** (capitalism vs socialism presentations)
- **Colonial/Post-colonial** perspectives
- **Diplomatic relations** that have dramatically changed
- **Cultural stereotypes** that were taught as fact
- **Historical interpretations** that have since evolved

CRITICAL JSON FORMATTING RULES:
- Use double quotes for ALL strings
- Escape quotes inside strings with backslash: \\"
- No trailing commas
- No line breaks inside string values
- Test your JSON before responding

Return ONLY a valid JSON array with NO markdown formatting:

[
  {
    "category": "Politics",
    "fact": "In ${year}, students in ${country} were taught that [specific political statement - keep under 150 characters]",
    "correction": "Today we understand that [nuanced political reality - 2-3 sentences max]",
    "yearDebunked": [year when understanding changed],
    "mindBlowingFactor": "This evolution [significance - 2 sentences max]",
    "sourceUrl": "https://credible-source.com",
    "sourceName": "Institution Name"
  }
]

Focus on genuine political teachings from ${year} textbooks in ${country}.`;
  } else if (factType === 'historical') {
    prompt = `You are a historian analyzing political beliefs in ${country} around ${year}. 

Generate exactly 2-3 political/diplomatic beliefs that educated people in ${country} commonly held in ${year} but have since been proven wrong.

CRITICAL JSON FORMATTING RULES:
- Use double quotes for ALL strings
- Escape quotes inside strings with \\"
- No trailing commas
- Keep strings concise

Return ONLY a valid JSON array:

[
  {
    "category": "Historical Politics",
    "fact": "In ${year}, educated people in ${country} commonly believed that [specific belief - under 150 chars]",
    "correction": "Today we understand that [modern perspective - 2-3 sentences]",
    "yearDebunked": [year when understanding changed],
    "mindBlowingFactor": "This evolution [significance - 2 sentences]",
    "sourceUrl": "https://credible-source.com",
    "sourceName": "Historical Institution"
  }
]`;
  } else {
    prompt = `You are a historian analyzing worldviews in ${country} around ${year}. 

Generate exactly 2-3 beliefs about politics/society that people in ${country} commonly held in ${year} but have been transformed.

CRITICAL JSON FORMATTING RULES:
- Use double quotes for ALL strings
- Escape quotes inside strings with \\"
- No trailing commas
- Keep strings under 200 characters each

Return ONLY a valid JSON array:

[
  {
    "category": "Ancient Worldview",
    "fact": "In ${year}, people in ${country} commonly believed that [specific belief - under 150 chars]",
    "correction": "Today we understand that [modern perspective - 2-3 sentences]",
    "yearDebunked": [year when shift occurred],
    "mindBlowingFactor": "This transformation [significance - 2 sentences]",
    "sourceUrl": "https://credible-source.com",
    "sourceName": "Historical Institution"
  }
]`;
  }

  return await makeAIRequest(prompt, 'political-facts');
}

// Generate education system problems for the given country and year
async function generateEducationProblems(country: string, year: number): Promise<EducationSystemProblem[]> {
  const factType = getFactGenerationType(year);
  let prompt = '';
  
  if (factType === 'modern') {
    prompt = `List 3-5 major problems that the education system in ${country} faced around ${year}.

CRITICAL JSON FORMATTING:
- Use double quotes only
- No trailing commas
- Keep descriptions under 200 characters

Return ONLY a valid JSON array:
[
  {
    "problem": "Brief title",
    "description": "2-3 sentence description",
    "impact": "How this affected education quality"
  }
]`;
  } else if (factType === 'historical') {
    prompt = `List 3-5 challenges that education faced in ${country} around ${year}.

CRITICAL JSON FORMATTING:
- Use double quotes only
- Escape any quotes with \\"
- No trailing commas

Return ONLY a valid JSON array:
[
  {
    "problem": "Brief challenge title",
    "description": "2-3 sentence description",
    "impact": "How this affected learning"
  }
]`;
  } else {
    prompt = `List 3-5 challenges that knowledge and learning faced in ${country} around ${year}.

CRITICAL JSON FORMATTING:
- Use double quotes only
- Escape quotes with \\"
- No trailing commas

Return ONLY a valid JSON array:
[
  {
    "problem": "Brief challenge title",
    "description": "2-3 sentence description",
    "impact": "How this affected knowledge sharing"
  }
]`;
  }

  return await makeAIRequest(prompt, 'education-problems');
}

// Generate regular academic facts with dynamic prompts based on year
async function generateOutdatedFacts(country: string, year: number): Promise<OutdatedFact[]> {
  const currentYear = new Date().getFullYear();
  const factType = getFactGenerationType(year);
  
  let prompt = '';
  
  if (factType === 'modern') {
    prompt = `You are an educational historian analyzing what students in ${country} were taught in ${year} vs what we know today.

Generate exactly 4-5 concrete scientific/medical facts that were taught in ${country} schools around ${year} but have since been proven wrong.

Focus on these categories:
- **Science** (biology, chemistry, physics discoveries)
- **Medicine** (health advice, medical understanding)  
- **Space/Astronomy** (planetary status, universe understanding)
- **Technology** (predictions, capabilities)
- **Nutrition** (dietary recommendations)
- **Environment** (climate, pollution understanding)

CRITICAL JSON FORMATTING RULES:
- Use ONLY double quotes for strings
- Escape any quotes inside strings with \\"
- NO trailing commas anywhere
- NO line breaks inside string values
- Keep each string under 300 characters
- Test your JSON is valid before responding

Example format (follow exactly):
{
  "category": "Science",
  "fact": "In ${year}, students in ${country} were taught that atoms are indivisible",
  "correction": "Today we know atoms contain protons, neutrons, and electrons. This understanding changed after Thomson discovered the electron in 1897.",
  "yearDebunked": 1932,
  "mindBlowingFactor": "This discovery led to modern electronics and nuclear physics.",
  "sourceUrl": "https://www.example.com",
  "sourceName": "Scientific Institution"
}

Return ONLY a valid JSON array with NO markdown:

[
  // Generate 4-5 facts following the exact format above
]`;
  } else if (factType === 'historical') {
    prompt = `You are a historian analyzing scientific beliefs in ${country} around ${year}.

Generate exactly 4-5 scientific/natural beliefs that educated people in ${country} commonly held in ${year} but have been overturned.

Focus on:
- **Natural Philosophy** (early scientific theories)
- **Medicine** (medical theories and treatments)
- **Astronomy** (understanding of celestial bodies)
- **Geography** (world knowledge)
- **Biology** (understanding of life)

CRITICAL JSON FORMATTING RULES:
- Use ONLY double quotes
- Escape quotes inside strings with \\"
- NO trailing commas
- Keep strings under 300 characters
- NO line breaks in strings

Return ONLY a valid JSON array:

[
  {
    "category": "Historical Science",
    "fact": "In ${year}, educated people in ${country} believed that [scientific belief - under 150 chars]",
    "correction": "Today we know that [modern understanding - 2-3 sentences max]",
    "yearDebunked": [year when overturned],
    "mindBlowingFactor": "This revolution [significance - 2 sentences max]",
    "sourceUrl": "https://credible-source.com",
    "sourceName": "Historical Institution"
  }
]`;
  } else {
    prompt = `You are a historian analyzing beliefs about nature in ${country} around ${year}.

Generate exactly 4-5 beliefs about the natural world that people in ${country} commonly held in ${year} but have been transformed.

Focus on:
- **Cosmology** (beliefs about universe and earth)
- **Medical theories** (disease and healing)
- **Natural world** (animals, plants, weather)
- **Geography** (world layout)
- **Elements** (theories about matter)

CRITICAL JSON FORMATTING RULES:
- Use ONLY double quotes
- Escape quotes with \\"
- NO trailing commas
- Keep strings concise
- NO line breaks in strings

Return ONLY a valid JSON array:

[
  {
    "category": "Ancient Natural Beliefs",
    "fact": "In ${year}, people in ${country} believed that [belief - under 150 chars]",
    "correction": "Today we understand that [modern knowledge - 2-3 sentences]",
    "yearDebunked": [year when understanding shifted],
    "mindBlowingFactor": "This transformation [significance - 2 sentences]",
    "sourceUrl": "https://credible-source.com",
    "sourceName": "Historical Institution"
  }
]`;
  }

  return await makeAIRequest(prompt, 'outdated-facts');
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
async function makeAIRequest(prompt: string, requestType: 'outdated-facts' | 'education-problems' | 'political-facts'): Promise<any[]> {
  const makeOpenAIRequest = async () => {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not available');
    }

    console.log(`Making OpenAI API request for ${requestType}...`);
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: 'You are an educational historian. You MUST return ONLY valid JSON arrays with NO markdown formatting. Use double quotes only. Escape internal quotes with backslash. NO trailing commas. Test JSON validity before responding.' 
          },
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
    
    console.log(`Making Gemini API request for ${requestType}...`);
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt + "\n\nIMPORTANT: Return ONLY valid JSON. Use double quotes. Escape internal quotes with \\. NO trailing commas."
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

  // Try OpenAI first, fall back to Gemini, with retry mechanism for JSON parsing
  let response: string;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      response = await retryWithBackoff(makeOpenAIRequest, 2, 1000);
      break;
    } catch (openAIError) {
      console.log(`OpenAI failed for ${requestType} (attempt ${attempts + 1}), trying Gemini fallback:`, openAIError.message);
      try {
        response = await retryWithBackoff(makeGeminiRequest, 2, 1000);
        break;
      } catch (geminiError) {
        attempts++;
        if (attempts >= maxAttempts) {
          console.error(`Both OpenAI and Gemini failed for ${requestType} after ${maxAttempts} attempts`);
          throw new Error(`Both AI providers failed to generate ${requestType} after multiple attempts`);
        }
        console.log(`Both providers failed for ${requestType}, retrying attempt ${attempts + 1}...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  // Parse and validate the response with enhanced error handling
  let results: any[];
  try {
    const extractedText = extractJSONFromResponse(response!);
    console.log(`Extracted JSON text for ${requestType}:`, extractedText);
    results = JSON.parse(extractedText);
  } catch (parseError) {
    console.error(`JSON parsing error for ${requestType}:`, parseError);
    console.error(`Raw AI response for ${requestType}:`, response!);
    
    // Try alternative parsing methods
    try {
      const cleanedText = aggressiveJSONCleaning(response!);
      console.log(`Trying aggressive cleaning for ${requestType}:`, cleanedText);
      results = JSON.parse(cleanedText);
      console.log(`Aggressive cleaning succeeded for ${requestType}`);
    } catch (secondParseError) {
      console.error(`Even aggressive cleaning failed for ${requestType}:`, secondParseError);
      throw new Error(`Failed to parse JSON response from AI for ${requestType} after multiple attempts`);
    }
  }

  // Validate structure
  if (!Array.isArray(results)) {
    console.error(`Response is not an array for ${requestType}:`, results);
    throw new Error(`Response is not an array for ${requestType}`);
  }

  if (results.length === 0) {
    console.error(`No ${requestType} generated`);
    throw new Error(`No ${requestType} were generated`);
  }

  // Validate based on request type
  if (requestType === 'outdated-facts' || requestType === 'political-facts') {
    for (let i = 0; i < results.length; i++) {
      const fact = results[i];
      if (!fact.category || !fact.fact || !fact.correction || !fact.yearDebunked || !fact.mindBlowingFactor) {
        console.error(`Fact ${i} is missing required fields:`, fact);
        throw new Error(`Fact ${i} is missing required fields`);
      }
    }
  } else if (requestType === 'education-problems') {
    for (let i = 0; i < results.length; i++) {
      const problem = results[i];
      if (!problem.problem || !problem.description || !problem.impact) {
        console.error(`Education problem ${i} is missing required fields:`, problem);
        throw new Error(`Education problem ${i} is missing required fields`);
      }
    }
  }

  console.log(`Successfully validated ${results.length} ${requestType}`);
  return results;
}

// Helper function to extract JSON from AI response
function extractJSONFromResponse(generatedText: string): string {
  let extractedText = generatedText.trim();
  
  // Remove any markdown code blocks first
  extractedText = extractedText.replace(/```json\s*/, '').replace(/```\s*$/, '');
  extractedText = extractedText.replace(/```\s*/, '');
  
  // Method 1: Direct array extraction with better boundary detection
  let arrayMatch = extractedText.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    let jsonText = arrayMatch[0];
    
    // Try to fix common JSON issues
    jsonText = fixCommonJSONIssues(jsonText);
    
    return jsonText;
  }
  
  // Method 2: Find array boundaries manually
  const startIndex = extractedText.indexOf('[');
  const lastIndex = extractedText.lastIndexOf(']');
  if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
    let jsonText = extractedText.substring(startIndex, lastIndex + 1);
    
    // Try to fix common JSON issues
    jsonText = fixCommonJSONIssues(jsonText);
    
    return jsonText;
  }
  
  console.error('Could not extract JSON from response:', extractedText);
  throw new Error('Could not extract valid JSON from AI response');
}

// Enhanced JSON cleaning function
function fixCommonJSONIssues(jsonText: string): string {
  console.log('Original JSON text length:', jsonText.length);
  
  // Remove any surrounding whitespace and code blocks
  jsonText = jsonText.trim();
  jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  
  // Fix trailing commas before closing brackets or braces
  jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix missing commas between objects/arrays
  jsonText = jsonText.replace(/}(\s*){/g, '},\n{');
  jsonText = jsonText.replace(/](\s*)\[/g, '],\n[');
  
  // Fix newlines within JSON strings that break parsing
  jsonText = jsonText.replace(/"([^"]*)\n([^"]*)"(\s*[,}:\]])/g, '"$1 $2"$3');
  
  // Fix multiple spaces in strings
  jsonText = jsonText.replace(/"([^"]*?)\s{2,}([^"]*?)"/g, '"$1 $2"');
  
  console.log('Cleaned JSON text length:', jsonText.length);
  return jsonText;
}

// Aggressive JSON cleaning as fallback
function aggressiveJSONCleaning(response: string): string {
  console.log('Attempting aggressive JSON cleaning...');
  
  let text = response.trim();
  
  // Remove everything before first [ and after last ]
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  
  if (firstBracket === -1 || lastBracket === -1) {
    throw new Error('No valid JSON array structure found');
  }
  
  text = text.substring(firstBracket, lastBracket + 1);
  
  // More aggressive cleaning
  text = text.replace(/```json|```/g, '');
  text = text.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
  text = text.replace(/([{,]\s*)(\w+):/g, '$1"$2":'); // Quote unquoted keys
  text = text.replace(/:\s*'([^']*)'/g, ': "$1"'); // Convert single quotes to double
  text = text.replace(/\\'/g, "'"); // Fix escaped single quotes
  text = text.replace(/\n/g, ' '); // Remove all newlines
  text = text.replace(/\s+/g, ' '); // Normalize whitespace
  
  console.log('Aggressively cleaned text:', text.substring(0, 200) + '...');
  return text;
}

// Generate quick fun fact about country and year
async function generateQuickFunFact(country: string, year: number): Promise<string> {
  const factType = getFactGenerationType(year);
  let prompt = '';
  
  if (factType === 'modern') {
    prompt = `Generate a single, interesting historical fun fact about ${country} in the year ${year}. 

Focus on something cool that happened that year - like weather, culture, politics, economy, sports, or notable events. Make it engaging and specific to that exact year.

Return ONLY the fun fact as a single sentence, no additional formatting or explanation.`;
  } else if (factType === 'historical') {
    prompt = `Generate a single, interesting historical fun fact about ${country} around the year ${year}.

Focus on something fascinating from that era - like major events, cultural developments, notable figures, technological advances, or social changes. Make it engaging and historically accurate for that time period.

Return ONLY the fun fact as a single sentence, no additional formatting or explanation.`;
  } else {
    prompt = `Generate a single, interesting historical fun fact about ${country} around the year ${year}.

Focus on something fascinating from that ancient era - like major historical events, cultural practices, notable rulers, early technologies, or social structures. Make it engaging and historically plausible for that time period.

Return ONLY the fun fact as a single sentence, no additional formatting or explanation.`;
  }

  const makeOpenAIRequest = async () => {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not available');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a historian specializing in interesting historical facts. Return only the requested fun fact, nothing else.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 150
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  };

  const makeGeminiRequest = async () => {
    if (!geminiApiKey) {
      throw new Error('Gemini API key not available');
    }
    
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
    const { country, graduationYear }: GenerateFactsRequest = await req.json();
    
    console.log(`Processing request for country: ${country}, graduation year: ${graduationYear}`);

    // Generate quick fun fact first and return it immediately
    const quickFunFact = await generateQuickFunFact(country, graduationYear);
    console.log(`Generated quick fun fact: ${quickFunFact}`);

    // Check for cached data
    const { data: cachedData, error: cacheError } = await supabase
      .from('cached_facts')
      .select('facts_data, education_system_problems, created_at')
      .eq('country', country)
      .eq('graduation_year', graduationYear)
      .single();

    if (cacheError && cacheError.code !== 'PGRST116') {
      console.error('Cache lookup error:', cacheError);
    }

    // Return cached data if it exists and is recent (within 6 months)
    if (cachedData && cachedData.facts_data && cachedData.education_system_problems) {
      const cacheAge = Date.now() - new Date(cachedData.created_at).getTime();
      const sixMonthsInMs = 6 * 30 * 24 * 60 * 60 * 1000;
      
      if (cacheAge < sixMonthsInMs) {
        console.log(`Returning cached data for ${country} ${graduationYear} (cached ${Math.round(cacheAge / (24 * 60 * 60 * 1000))} days ago)`);
        return new Response(JSON.stringify({ 
          quickFunFact,
          facts: cachedData.facts_data,
          educationProblems: cachedData.education_system_problems,
          cached: true,
          cacheAge: Math.round(cacheAge / (24 * 60 * 60 * 1000))
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log(`Generating new data for ${country} ${graduationYear}`);

    // Generate facts and education problems separately, with better error handling
    let politicalFacts: any[] = [];
    let regularFacts: any[] = [];
    let educationProblems: any[] = [];

    try {
      // Try to generate regular facts first (science, etc.) as they are prioritized in display
      console.log('Starting fact generation - prioritizing scientific facts...');
      
      const results = await Promise.allSettled([
        generateOutdatedFacts(country, graduationYear), // Scientific facts first
        generatePoliticalFacts(country, graduationYear),
        generateEducationProblems(country, graduationYear)
      ]);

      if (results[0].status === 'fulfilled') {
        regularFacts = results[0].value;
        console.log(`Successfully generated ${regularFacts.length} scientific/regular facts`);
      } else {
        console.error('Scientific facts generation failed:', results[0].reason);
      }

      if (results[1].status === 'fulfilled') {
        politicalFacts = results[1].value;
        console.log(`Successfully generated ${politicalFacts.length} political facts`);
      } else {
        console.error('Political facts generation failed:', results[1].reason);
      }

      if (results[2].status === 'fulfilled') {
        educationProblems = results[2].value;
        console.log(`Successfully generated ${educationProblems.length} education problems`);
      } else {
        console.error('Education problems generation failed:', results[2].reason);
      }

      // Ensure we have some content
      if (regularFacts.length === 0 && politicalFacts.length === 0 && educationProblems.length === 0) {
        console.log(`No facts generated for ${country} ${graduationYear}. This might be a very specific combination.`);
        throw new Error('Failed to generate any content for this combination');
      }

    } catch (error) {
      console.error('Error generating facts:', error);
      throw error;
    }

    // Combine facts - prioritize scientific facts first
    const allFacts = [...regularFacts, ...politicalFacts];
    
    console.log(`Final result: ${regularFacts.length} scientific facts, ${politicalFacts.length} political facts, ${educationProblems.length} education problems`);
    console.log('Scientific fact categories:', regularFacts.map(f => f.category));

    // Save the generated data to cache only if we have content
    if (allFacts.length > 0 || educationProblems.length > 0) {
      try {
        const { error: insertError } = await supabase
          .from('cached_facts')
          .upsert({
            country,
            graduation_year: graduationYear,
            facts_data: allFacts,
            education_system_problems: educationProblems,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'country,graduation_year'
          });

        if (insertError) {
          console.error('Failed to cache data:', insertError);
        } else {
          console.log(`Successfully cached data for ${country} ${graduationYear}`);
        }
      } catch (cacheError) {
        console.error('Cache insertion error:', cacheError);
      }
    }

    return new Response(JSON.stringify({ 
      quickFunFact,
      facts: allFacts,
      educationProblems,
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
