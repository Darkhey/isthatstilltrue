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

For each political fact, provide:
1. What was definitively taught about international relations in ${year}
2. How our understanding has evolved with historical perspective
3. When this understanding changed
4. Why this political evolution matters

EXAMPLES of the format:

For USA 1985:
- "Japan's economic model is fundamentally different and poses a threat to American capitalism" → "Today we understand that Japan's economic practices represented a different but valid approach to market economics, contributing to global economic diversity"

For Germany 1960:
- "Africa is a continent that needs European guidance for development" → "Today we recognize the complex legacy of colonialism and the indigenous knowledge, governance systems, and economic structures that existed before and alongside European contact"

Return ONLY a valid JSON array with NO markdown formatting:

[
  {
    "category": "Politics",
    "fact": "In ${year}, students in ${country} were taught that [specific political/international statement]",
    "correction": "Today we understand that [nuanced political reality with historical context - 3-4 sentences explaining how political understanding evolved]",
    "yearDebunked": [year when political understanding changed],
    "mindBlowingFactor": "This political evolution [explain significance and what it reveals about international relations - 2-3 sentences]",
    "sourceUrl": "https://credible-historical-source.com",
    "sourceName": "Historical Institution/Archive Name"
  }
]

Focus on genuine political teachings that were presented as fact in ${year} textbooks in ${country}, avoiding current political debates.`;
  } else if (factType === 'historical') {
    prompt = `You are a historian analyzing political beliefs and international perspectives in ${country} around ${year}. 

Generate exactly 2-3 political/diplomatic beliefs that educated people in ${country} commonly held in ${year} but have since been proven wrong or significantly updated.

Focus on these areas for the year ${year}:
- **Views on neighboring countries** and international relations
- **Colonial attitudes** and imperial perspectives of the time
- **Economic theories** and trade beliefs
- **Diplomatic assumptions** about alliances and conflicts
- **Cultural superiority** beliefs common in that era
- **Territorial disputes** and expansion justifications

For each belief, provide:
1. What educated people in ${country} generally believed about politics/diplomacy in ${year}
2. How our understanding has evolved with historical perspective
3. When this understanding significantly changed
4. Why this evolution matters for understanding history

Return ONLY a valid JSON array with NO markdown formatting:

[
  {
    "category": "Historical Politics",
    "fact": "In ${year}, educated people in ${country} commonly believed that [specific political/diplomatic belief]",
    "correction": "Today we understand that [modern historical perspective with context - 3-4 sentences explaining how understanding evolved]",
    "yearDebunked": [approximate year when understanding changed],
    "mindBlowingFactor": "This evolution [explain historical significance - 2-3 sentences]",
    "sourceUrl": "https://credible-historical-source.com",
    "sourceName": "Historical Archive/Institution Name"
  }
]`;
  } else {
    prompt = `You are a historian analyzing worldviews and beliefs in ${country} around ${year}. 

Generate exactly 2-3 political, social, or diplomatic beliefs that people in ${country} commonly held in ${year} but have since been completely transformed.

Focus on these areas for the year ${year}:
- **Views on governance** and political authority
- **International relations** and foreign peoples
- **Social hierarchies** and class systems
- **Economic beliefs** about trade and wealth
- **Territorial concepts** and geographic understanding
- **Cultural assumptions** about other civilizations

For each belief, provide:
1. What people in ${country} generally believed in ${year}
2. How completely our perspective has changed
3. When this major shift occurred
4. Why this transformation is historically significant

Return ONLY a valid JSON array with NO markdown formatting:

[
  {
    "category": "Ancient Worldview",
    "fact": "In ${year}, people in ${country} commonly believed that [specific belief about politics/society/world]",
    "correction": "Today we understand that [completely different modern perspective - 3-4 sentences explaining the transformation]",
    "yearDebunked": [approximate year when major shift occurred],
    "mindBlowingFactor": "This transformation [explain historical significance of the change - 2-3 sentences]",
    "sourceUrl": "https://credible-historical-source.com",
    "sourceName": "Historical Research Institution"
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
    prompt = `List 3-5 major problems that the education system in ${country} faced specifically around ${year}.

Focus on concrete, historical issues like:
- Teacher shortages
- Funding problems
- Outdated curricula
- Technology gaps
- Infrastructure issues
- Policy problems
- Social/political challenges

Return ONLY a valid JSON array:
[
  {
    "problem": "Brief problem title",
    "description": "2-3 sentence description of the specific issue",
    "impact": "How this affected students and education quality"
  }
]`;
  } else if (factType === 'historical') {
    prompt = `List 3-5 major challenges that education or knowledge sharing faced in ${country} around ${year}.

Focus on historical issues like:
- Limited access to education
- Religious or political restrictions on learning
- Lack of standardized curricula
- Economic barriers to education
- Gender or class restrictions
- Limited availability of books/materials
- Geographic isolation of schools

Return ONLY a valid JSON array:
[
  {
    "problem": "Brief challenge title",
    "description": "2-3 sentence description of the historical issue",
    "impact": "How this affected learning and knowledge sharing"
  }
]`;
  } else {
    prompt = `List 3-5 major challenges that knowledge and learning faced in ${country} around ${year}.

Focus on ancient/medieval issues like:
- Extremely limited literacy
- Knowledge restricted to religious institutions
- Oral tradition limitations
- Lack of written materials
- Political instability affecting learning
- Economic survival taking priority over education
- Social hierarchy restrictions on knowledge

Return ONLY a valid JSON array:
[
  {
    "problem": "Brief challenge title",
    "description": "2-3 sentence description of the ancient/medieval issue",
    "impact": "How this affected knowledge preservation and sharing"
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
    prompt = `You are an educational historian analyzing what students in ${country} were taught in ${year} vs what we know today in ${currentYear}.

Generate exactly 4-5 concrete, factual statements that were commonly taught in ${country} schools around ${year} but have since been proven wrong or significantly updated.

Focus on these categories where knowledge has genuinely changed:
- **Science** (biology, chemistry, physics discoveries)
- **Technology** (predictions, computer capabilities)  
- **Medicine** (health advice, medical understanding)
- **Space/Astronomy** (planetary status, universe understanding)
- **Nutrition** (dietary recommendations)
- **Environment** (climate, pollution understanding)
- **History** (recent events, interpretations)
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
  } else if (factType === 'historical') {
    prompt = `You are a historian analyzing what educated people in ${country} believed about the natural world and science around ${year}.

Generate exactly 4-5 scientific, medical, or natural beliefs that educated people in ${country} commonly held in ${year} but have since been completely overturned.

Focus on these categories for the year ${year}:
- **Natural Philosophy** (early scientific theories)
- **Medicine** (medical theories and treatments)
- **Astronomy** (understanding of celestial bodies)
- **Geography** (world knowledge and maps)
- **Biology** (understanding of life and body)
- **Physics** (theories about matter and forces)
- **Chemistry** (early chemical theories)

For each belief, provide:
1. What educated people in ${country} generally believed in ${year}
2. What we know now with modern scientific understanding
3. When this belief was significantly challenged or overturned
4. Why this change represents a major scientific revolution

Return ONLY a valid JSON array with NO markdown formatting:

[
  {
    "category": "Historical Science/Medicine/Natural Philosophy",
    "fact": "In ${year}, educated people in ${country} believed that [specific scientific/natural belief]",
    "correction": "Today we know that [modern scientific understanding - 3-4 sentences explaining the scientific revolution that occurred]",
    "yearDebunked": [approximate year when belief was overturned],
    "mindBlowingFactor": "This scientific revolution [explain significance for human knowledge - 2-3 sentences]",
    "sourceUrl": "https://credible-historical-source.com",
    "sourceName": "Historical Science Archive/Institution"
  }
]`;
  } else {
    prompt = `You are a historian analyzing worldviews and beliefs about the natural world in ${country} around ${year}.

Generate exactly 4-5 beliefs about nature, the world, medicine, or the cosmos that people in ${country} commonly held in ${year} but have been completely transformed by modern knowledge.

Focus on these areas for the year ${year}:
- **Cosmology** (beliefs about the universe and earth)
- **Medical theories** (understanding of disease and healing)
- **Natural world** (beliefs about animals, plants, weather)
- **Geography** (understanding of the world's layout)
- **Human body** (anatomical and physiological beliefs)
- **Elements and matter** (early theories about substances)
- **Supernatural explanations** for natural phenomena

For each belief, provide:
1. What people in ${country} commonly believed in ${year}
2. How completely different our modern understanding is
3. When major shifts in understanding occurred
4. Why this transformation is remarkable for human knowledge

Return ONLY a valid JSON array with NO markdown formatting:

[
  {
    "category": "Ancient Natural Beliefs",
    "fact": "In ${year}, people in ${country} believed that [specific belief about nature/world/medicine]",
    "correction": "Today we understand that [completely different modern knowledge - 3-4 sentences explaining the transformation]",
    "yearDebunked": [approximate year when major understanding shift occurred],
    "mindBlowingFactor": "This transformation [explain how remarkable this change in human understanding is - 2-3 sentences]",
    "sourceUrl": "https://credible-historical-source.com",
    "sourceName": "Historical Research Institution"
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
    
    console.log(`Making Gemini API request for ${requestType}...`);
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
    console.log(`OpenAI failed for ${requestType}, trying Gemini fallback:`, openAIError.message);
    try {
      response = await retryWithBackoff(makeGeminiRequest, 3, 2000);
    } catch (geminiError) {
      console.error(`Both OpenAI and Gemini failed for ${requestType}:`, { openAIError: openAIError.message, geminiError: geminiError.message });
      throw new Error(`Both AI providers failed to generate ${requestType}`);
    }
  }

  // Parse and validate the response
  let results: any[];
  try {
    const extractedText = extractJSONFromResponse(response);
    console.log(`Extracted JSON text for ${requestType}:`, extractedText);
    results = JSON.parse(extractedText);
  } catch (parseError) {
    console.error(`JSON parsing error for ${requestType}:`, parseError);
    console.error(`Raw AI response for ${requestType}:`, response);
    throw new Error(`Failed to parse JSON response from AI for ${requestType}`);
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

// Helper function to fix common JSON formatting issues
function fixCommonJSONIssues(jsonText: string): string {
  // Remove any surrounding whitespace and code blocks
  jsonText = jsonText.trim();
  jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  
  // Handle escaped single quotes that are breaking JSON
  jsonText = jsonText.replace(/\\'/g, "'");
  
  // Fix unescaped quotes within string values - more conservative approach
  // Only fix obvious cases where quotes appear within values
  jsonText = jsonText.replace(/: "([^"]*)"([^,}\]]*)"([^"]*)",/g, ': "$1\\"$2\\"$3",');
  jsonText = jsonText.replace(/: "([^"]*)"([^,}\]]*)"([^"]*)"$/gm, ': "$1\\"$2\\"$3"');
  
  // Fix unescaped single quotes in JSON strings (common in contractions)
  jsonText = jsonText.replace(/"([^"]*?)([a-zA-Z])'([a-zA-Z])([^"]*?)"/g, '"$1$2\\\'$3$4"');
  
  // Fix trailing commas before closing brackets or braces
  jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix missing commas between objects/arrays
  jsonText = jsonText.replace(/}(\s*){/g, '},\n{');
  jsonText = jsonText.replace(/](\s*)\[/g, '],\n[');
  
  // Fix newlines within JSON strings that break parsing
  jsonText = jsonText.replace(/"([^"]*)\n([^"]*)"(\s*[,}:\]])/g, '"$1 $2"$3');
  
  return jsonText;
}

// Generate quick fun fact about country and year
async function generateQuickFunFact(country: string, year: number): Promise<string> {
  const factType = getFactGenerationType(year);
  let prompt = '';
  
  if (factType === 'modern') {
    prompt = `Generate a single, interesting historical fun fact about ${country} in the year ${year}. 

Focus on something cool that happened that year - like weather, culture, politics, economy, sports, or notable events. Make it engaging and specific to that exact year.

Examples:
- "1980 was the hottest summer on record in Moldova, with temperatures reaching 42°C"
- "In 1995, Germany introduced its first commercial internet service provider"
- "1987 marked the year when Spain joined the European Economic Community"

Return ONLY the fun fact as a single sentence, no additional formatting or explanation.`;
  } else if (factType === 'historical') {
    prompt = `Generate a single, interesting historical fun fact about ${country} around the year ${year}.

Focus on something fascinating from that era - like major events, cultural developments, notable figures, technological advances, or social changes. Make it engaging and historically accurate for that time period.

Examples:
- "In 1850, Sweden experienced a major railway boom with the first major line connecting Stockholm to Gothenburg"
- "Around 1823, Germany saw the rise of student fraternities that would shape university culture for centuries"
- "In 1801, France under Napoleon was restructuring its entire legal system with the Napoleonic Code"

Return ONLY the fun fact as a single sentence, no additional formatting or explanation.`;
  } else {
    prompt = `Generate a single, interesting historical fun fact about ${country} around the year ${year}.

Focus on something fascinating from that ancient era - like major historical events, cultural practices, notable rulers, early technologies, or social structures. Make it engaging and historically plausible for that time period.

Examples:
- "Around 1650, Sweden was emerging as a major European power under Queen Christina"
- "In 1492, Spain completed its Reconquista and was funding Columbus's voyages to the New World"
- "Around 1300, France was experiencing the height of Gothic cathedral construction"

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
      const results = await Promise.allSettled([
        generatePoliticalFacts(country, graduationYear),
        generateOutdatedFacts(country, graduationYear),
        generateEducationProblems(country, graduationYear)
      ]);

      if (results[0].status === 'fulfilled') {
        politicalFacts = results[0].value;
      } else {
        console.error('Political facts generation failed:', results[0].reason);
      }

      if (results[1].status === 'fulfilled') {
        regularFacts = results[1].value;
      } else {
        console.error('Regular facts generation failed:', results[1].reason);
      }

      if (results[2].status === 'fulfilled') {
        educationProblems = results[2].value;
      } else {
        console.error('Education problems generation failed:', results[2].reason);
      }

      // For historical periods, we should always generate something interesting
      if (politicalFacts.length === 0 && regularFacts.length === 0 && educationProblems.length === 0) {
        console.log(`No facts generated initially, this might be a very old year (${graduationYear}). The system should have generated historical perspectives.`);
        throw new Error('Failed to generate any historical content');
      }

    } catch (error) {
      console.error('Error generating facts:', error);
      throw error;
    }

    // Combine and prioritize political facts first
    const allFacts = [...politicalFacts, ...regularFacts];
    
    console.log(`Successfully generated ${politicalFacts.length} political facts, ${regularFacts.length} regular facts, and ${educationProblems.length} education problems`);

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
