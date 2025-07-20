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

// Historical context mapping for countries/regions
function getHistoricalContext(country: string, year: number): { region: string; educationSystem: string; culturalContext: string } {
  const contexts: Record<string, any> = {
    "Germany": {
      pre1871: { region: "Deutsche Länder/Heiliges Römisches Reich", educationSystem: "Klosterschulen und Universitäten verschiedener Fürstentümer", culturalContext: "Fragmentierte deutsche Territorialstaaten" },
      pre1918: { region: "Deutsches Kaiserreich", educationSystem: "Preußisches Bildungssystem", culturalContext: "Aufstrebende Industriemacht" },
      pre1949: { region: "Deutschland", educationSystem: "Staatliches Bildungssystem", culturalContext: "Weimarer Republik und NS-Zeit" }
    },
    "Italy": {
      pre1861: { region: "Italienische Stadtstaaten und Königreiche", educationSystem: "Kirchliche und städtische Schulen", culturalContext: "Politisch fragmentiertes Italien" },
      pre1946: { region: "Königreich Italien", educationSystem: "Zentralisiertes italienisches Bildungssystem", culturalContext: "Vereinigtes Italien unter der Monarchie" }
    },
    "USA": {
      pre1776: { region: "Nordamerikanische Kolonien", educationSystem: "Koloniale Privatschulen und religiöse Institutionen", culturalContext: "Britische Kolonialherrschaft" },
      pre1865: { region: "Vereinigte Staaten (vor Bürgerkrieg)", educationSystem: "Dezentrale Bildungssysteme der Einzelstaaten", culturalContext: "Junge Republik mit Sklaverei" },
      pre1900: { region: "Vereinigte Staaten (Gilded Age)", educationSystem: "Aufbau öffentlicher Schulen", culturalContext: "Industrialisierung und Westexpansion" }
    },
    "United Kingdom": {
      pre1066: { region: "Angelsächsische Königreiche", educationSystem: "Klöster und königliche Höfe", culturalContext: "Frühmittelalterliche Stammeskönigreiche" },
      pre1707: { region: "England (vor Union)", educationSystem: "Kathedralschulen und frühe Universitäten", culturalContext: "Mittelalterliches England" },
      pre1800: { region: "Großbritannien", educationSystem: "Privatschulen und Grammar Schools", culturalContext: "Aufstiegendes Britisches Empire" }
    },
    "France": {
      pre1789: { region: "Königreich Frankreich", educationSystem: "Kirchliche Schulen und Jesuitenkollegien", culturalContext: "Absolutistische Monarchie" },
      pre1870: { region: "Frankreich (verschiedene Regime)", educationSystem: "Napoleonisches Bildungssystem", culturalContext: "Revolutionszeit und Napoleon" }
    },
    "Austria": {
      pre1918: { region: "Österreich-Ungarn", educationSystem: "Habsburger Bildungssystem", culturalContext: "Multiethnisches Kaiserreich" },
      pre1938: { region: "Republik Österreich", educationSystem: "Österreichisches Schulsystem", culturalContext: "Erste Republik" }
    },
    "Russia": {
      pre1917: { region: "Russisches Zarenreich", educationSystem: "Orthodoxe Kirchenschulen und Staatsgymnasien", culturalContext: "Autokratisches Zarenreich" },
      pre1991: { region: "Sowjetunion", educationSystem: "Sowjetisches Bildungssystem", culturalContext: "Kommunistische Ideologie" }
    },
    "China": {
      pre1912: { region: "Kaiserliches China", educationSystem: "Konfuzianische Akademien und Prüfungssystem", culturalContext: "Dynastische Herrschaft" },
      pre1949: { region: "Republik China", educationSystem: "Modernisierte chinesische Schulen", culturalContext: "Übergangszeit und Bürgerkrieg" }
    }
  };

  const countryContexts = contexts[country] || {};
  
  if (year < 1500) {
    return {
      region: countryContexts.pre1066?.region || `${country} (Mittelalterliche Regionen)`,
      educationSystem: "Klöster, Kathedralschulen und private Gelehrte",
      culturalContext: "Mittelalterliche Gesellschaftsordnung"
    };
  } else if (year < 1800) {
    return {
      region: countryContexts.pre1707?.region || countryContexts.pre1789?.region || `${country} (Frühe Neuzeit)`,
      educationSystem: "Humanistenschulen, Jesuitenkollegien und frühe Universitäten",
      culturalContext: "Renaissance bis Aufklärung"
    };
  } else if (year < 1871 && country === "Germany") {
    return countryContexts.pre1871;
  } else if (year < 1861 && country === "Italy") {
    return countryContexts.pre1861;
  } else if (year < 1776 && country === "USA") {
    return countryContexts.pre1776;
  } else if (year < 1917 && country === "Russia") {
    return countryContexts.pre1917;
  } else if (year < 1912 && country === "China") {
    return countryContexts.pre1912;
  } else if (year < 1918 && (country === "Austria" || country === "Germany")) {
    return countryContexts.pre1918 || countryContexts.pre1871;
  }
  
  return {
    region: country,
    educationSystem: "Modernes staatliches Bildungssystem",
    culturalContext: "Moderne Nationalstaaten"
  };
}

// Get knowledge domains appropriate for the historical period
function getHistoricalKnowledgeDomains(year: number): string[] {
  if (year < 1500) {
    return [
      "Vier-Säfte-Lehre (Medizin)",
      "Alchemie und Naturphilosophie", 
      "Ptolemäisches Weltbild",
      "Scholastische Theologie",
      "Handwerkszünfte und Gilden",
      "Feudale Gesellschaftsordnung"
    ];
  } else if (year < 1650) {
    return [
      "Übergang von Alchemie zur Chemie",
      "Kopernikanische Wende",
      "Frühe Anatomie und Medizin",
      "Humanistische Bildung",
      "Konfessionelle Spaltung",
      "Merkantilismus"
    ];
  } else if (year < 1800) {
    return [
      "Naturphilosophie und frühe Physik",
      "Aufklärungsmedizin",
      "Botanik und Taxonomie",
      "Politische Philosophie",
      "Experimentelle Methoden",
      "Gesellschaftsvertrag-Theorien"
    ];
  } else if (year < 1900) {
    return [
      "Frühe moderne Chemie",
      "Evolutionstheorie-Vorläufer",
      "Industrielle Revolution",
      "Nationalstaatsbildung",
      "Kolonialismus",
      "Dampfkraft und Mechanik"
    ];
  } else {
    return [
      "Moderne Wissenschaften",
      "Psychologie und Soziologie", 
      "Elektrizität und Magnetismus",
      "Bakteriologie",
      "Imperialismus",
      "Massenmedien"
    ];
  }
}

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

// Generate politics/international relations facts with historical context
async function generatePoliticalFacts(country: string, year: number): Promise<OutdatedFact[]> {
  const currentYear = new Date().getFullYear();
  const factType = getFactGenerationType(year);
  const historicalContext = getHistoricalContext(country, year);
  
  let prompt = '';
  
  if (factType === 'modern') {
    prompt = `You are an expert in international relations and political education. Analyze how students in ${historicalContext.region} were taught about politics and international relations in ${year} vs today in ${currentYear}.

Historical Context: ${historicalContext.culturalContext}
Education System: ${historicalContext.educationSystem}

Generate exactly 2-3 political/international relations facts that were commonly taught in ${historicalContext.region} around ${year} but have since been proven wrong, overly simplified, or significantly updated.

Focus on these areas:
- **Views on other nations/empires** (how ${historicalContext.region} students were taught to view other powers)
- **International conflicts** and how they were presented
- **Political systems** and ideologies of the time
- **Colonial attitudes** and imperial perspectives
- **Diplomatic relations** that have dramatically changed
- **Economic theories** prevalent at the time

CRITICAL JSON FORMATTING RULES:
- Use double quotes for ALL strings
- Escape quotes inside strings with backslash: \\\"
- No trailing commas
- No line breaks inside string values

Return ONLY a valid JSON array with NO markdown formatting:

[
  {
    "category": "Politics",
    "fact": "In ${year}, students in ${historicalContext.region} were taught that [specific political statement - keep under 150 characters]",
    "correction": "Today we understand that [nuanced political reality - 2-3 sentences max]",
    "yearDebunked": [year when understanding changed],
    "mindBlowingFactor": "This evolution [significance - 2 sentences max]",
    "sourceUrl": "https://credible-source.com",
    "sourceName": "Institution Name"
  }
]

Focus on genuine political teachings from ${year} in ${historicalContext.region}.`;
  } else if (factType === 'historical') {
    prompt = `You are a historian analyzing political beliefs in ${historicalContext.region} around ${year}.

Historical Context: ${historicalContext.culturalContext}
Political Reality: People lived under ${historicalContext.educationSystem} and were influenced by the dominant powers of the time.

Generate exactly 2-3 political/diplomatic beliefs that educated people in ${historicalContext.region} commonly held in ${year} but have since been proven wrong or dramatically changed.

Consider the actual political realities of ${year}:
- The region was called "${historicalContext.region}" not modern "${country}"
- Education was through ${historicalContext.educationSystem}
- Political worldview was shaped by ${historicalContext.culturalContext}

CRITICAL JSON FORMATTING RULES:
- Use double quotes for ALL strings
- Escape quotes inside strings with \\\"
- No trailing commas

Return ONLY a valid JSON array:

[
  {
    "category": "Historical Politics",
    "fact": "In ${year}, educated people in ${historicalContext.region} commonly believed that [specific belief - under 150 chars]",
    "correction": "Today we understand that [modern perspective - 2-3 sentences]",
    "yearDebunked": [year when understanding changed],
    "mindBlowingFactor": "This evolution [significance - 2 sentences]",
    "sourceUrl": "https://credible-source.com",
    "sourceName": "Historical Institution"
  }
]`;
  } else {
    prompt = `You are a historian analyzing worldviews in ${historicalContext.region} around ${year}.

Historical Reality: This was during ${historicalContext.culturalContext}, when "${country}" as we know it today did not exist. The region was "${historicalContext.region}" and knowledge was transmitted through ${historicalContext.educationSystem}.

Generate exactly 2-3 beliefs about politics/society that people in ${historicalContext.region} commonly held in ${year} but have been transformed by modern understanding.

Remember the historical context:
- No modern nation-states as we know them
- Different political structures (feudalism, tribal kingdoms, city-states)
- Knowledge preserved in monasteries, courts, or oral traditions
- Very different understanding of government, law, and society

CRITICAL JSON FORMATTING RULES:
- Use double quotes for ALL strings
- Escape quotes with \\\"
- No trailing commas

Return ONLY a valid JSON array:

[
  {
    "category": "Ancient Worldview",
    "fact": "In ${year}, people in ${historicalContext.region} believed that [specific belief - under 150 chars]",
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

// Generate education system problems with historical context
async function generateEducationProblems(country: string, year: number): Promise<EducationSystemProblem[]> {
  const factType = getFactGenerationType(year);
  const historicalContext = getHistoricalContext(country, year);
  
  let prompt = '';
  
  if (factType === 'modern') {
    prompt = `List 3-5 major problems that the education system in ${historicalContext.region} faced around ${year}.

Historical Context: ${historicalContext.culturalContext}
Education System: ${historicalContext.educationSystem}

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
    prompt = `List 3-5 challenges that education faced in ${historicalContext.region} around ${year}.

Historical Context: This was during ${historicalContext.culturalContext}
Education System: Knowledge was transmitted through ${historicalContext.educationSystem}

Remember: "${country}" as a modern state did not exist. Focus on the actual educational challenges of ${historicalContext.region} in ${year}.

CRITICAL JSON FORMATTING:
- Use double quotes only
- Escape quotes with \\\"
- No trailing commas

Return ONLY a valid JSON array:
[
  {
    "problem": "Brief challenge title",
    "description": "2-3 sentence description of the actual historical challenge",
    "impact": "How this affected learning in that era"
  }
]`;
  } else {
    prompt = `List 3-5 challenges that knowledge and learning faced in ${historicalContext.region} around ${year}.

Historical Reality: During ${historicalContext.culturalContext}, formal education was limited to ${historicalContext.educationSystem}. The modern concept of "${country}" did not exist.

Focus on authentic challenges of that era:
- Limited literacy
- Knowledge preservation issues
- Social/religious restrictions on learning
- Lack of standardized curricula
- Geographic/political fragmentation

CRITICAL JSON FORMATTING:
- Use double quotes only
- Escape quotes with \\\"
- No trailing commas

Return ONLY a valid JSON array:
[
  {
    "problem": "Brief historical challenge title",
    "description": "2-3 sentence description of the actual challenge",
    "impact": "How this affected knowledge sharing in that era"
  }
]`;
  }

  return await makeAIRequest(prompt, 'education-problems');
}

// Generate regular academic facts with historical context
async function generateOutdatedFacts(country: string, year: number): Promise<OutdatedFact[]> {
  const currentYear = new Date().getFullYear();
  const factType = getFactGenerationType(year);
  const historicalContext = getHistoricalContext(country, year);
  const knowledgeDomains = getHistoricalKnowledgeDomains(year);
  
  let prompt = '';
  
  if (factType === 'modern') {
    prompt = `You are an educational historian analyzing what students in ${historicalContext.region} were taught in ${year} vs what we know today.

Historical Context: ${historicalContext.culturalContext}
Education System: ${historicalContext.educationSystem}

Generate exactly 4-5 concrete scientific/medical facts that were taught in ${historicalContext.region} around ${year} but have since been proven wrong.

Focus on knowledge areas relevant to ${year}:
${knowledgeDomains.map(domain => `- **${domain}**`).join('\n')}

CRITICAL JSON FORMATTING RULES:
- Use ONLY double quotes for strings
- Escape any quotes inside strings with \\\"
- NO trailing commas anywhere
- NO line breaks inside string values
- Keep each string under 300 characters

Return ONLY a valid JSON array with NO markdown:

[
  {
    "category": "Science",
    "fact": "In ${year}, students in ${historicalContext.region} were taught that [specific scientific belief]",
    "correction": "Today we know that [modern understanding - 2-3 sentences]",
    "yearDebunked": [year when overturned],
    "mindBlowingFactor": "This discovery [significance - 2 sentences]",
    "sourceUrl": "https://credible-source.com",
    "sourceName": "Scientific Institution"
  }
]`;
  } else if (factType === 'historical') {
    prompt = `You are a historian analyzing scientific beliefs in ${historicalContext.region} around ${year}.

Historical Reality: This was during ${historicalContext.culturalContext}. The region was "${historicalContext.region}" and knowledge was transmitted through ${historicalContext.educationSystem}.

Knowledge domains of that era:
${knowledgeDomains.map(domain => `- ${domain}`).join('\n')}

Generate exactly 4-5 scientific/natural beliefs that educated people in ${historicalContext.region} commonly held in ${year} but have been overturned.

Remember: Use period-appropriate terminology and concepts. Don't anachronistically refer to modern "${country}" - use "${historicalContext.region}".

CRITICAL JSON FORMATTING RULES:
- Use ONLY double quotes
- Escape quotes inside strings with \\\"
- NO trailing commas
- Keep strings under 300 characters

Return ONLY a valid JSON array:

[
  {
    "category": "Historical Science",
    "fact": "In ${year}, educated people in ${historicalContext.region} believed that [scientific belief - under 150 chars]",
    "correction": "Today we know that [modern understanding - 2-3 sentences max]",
    "yearDebunked": [year when overturned],
    "mindBlowingFactor": "This revolution [significance - 2 sentences max]",
    "sourceUrl": "https://credible-source.com",
    "sourceName": "Historical Institution"
  }
]`;
  } else {
    prompt = `You are a historian analyzing beliefs about nature in ${historicalContext.region} around ${year}.

Historical Reality: During ${historicalContext.culturalContext}, the modern nation "${country}" did not exist. People lived in ${historicalContext.region} and learned through ${historicalContext.educationSystem}.

Ancient knowledge systems of that era:
${knowledgeDomains.map(domain => `- ${domain}`).join('\n')}

Generate exactly 4-5 beliefs about the natural world that people in ${historicalContext.region} commonly held in ${year} but have been transformed by modern knowledge.

Focus on authentic ancient/medieval beliefs:
- Four elements theory
- Humoral medicine
- Geocentric cosmology
- Aristotelian physics
- Alchemical theories
- Supernatural causation

CRITICAL JSON FORMATTING RULES:
- Use ONLY double quotes
- Escape quotes with \\\"
- NO trailing commas
- NO line breaks in strings

Return ONLY a valid JSON array:

[
  {
    "category": "Ancient Natural Beliefs", 
    "fact": "In ${year}, people in ${historicalContext.region} believed that [belief - under 150 chars]",
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

// Generate quick fun fact with historical context
async function generateQuickFunFact(country: string, year: number): Promise<string> {
  const factType = getFactGenerationType(year);
  const historicalContext = getHistoricalContext(country, year);
  
  let prompt = '';
  
  if (factType === 'modern') {
    prompt = `Generate a single, interesting historical fun fact about ${historicalContext.region} in the year ${year}.

Historical Context: ${historicalContext.culturalContext}

Focus on something cool that happened that year - like weather, culture, politics, economy, sports, or notable events. Make it engaging and specific to that exact year.

Use "${historicalContext.region}" not modern "${country}" if they are different.

Return ONLY the fun fact as a single sentence, no additional formatting or explanation.`;
  } else if (factType === 'historical') {
    prompt = `Generate a single, interesting historical fun fact about ${historicalContext.region} around the year ${year}.

Historical Context: During ${historicalContext.culturalContext}, the region was known as "${historicalContext.region}" (not modern "${country}").

Focus on something fascinating from that era - like major events, cultural developments, notable figures, technological advances, or social changes specific to ${historicalContext.region}. Make it engaging and historically accurate for that time period.

Return ONLY the fun fact as a single sentence, no additional formatting or explanation.`;
  } else {
    prompt = `Generate a single, interesting historical fun fact about ${historicalContext.region} around the year ${year}.

Historical Reality: This was during ${historicalContext.culturalContext}. The modern country "${country}" did not exist - the region was "${historicalContext.region}".

Focus on something fascinating from that ancient era - like major historical events, cultural practices, notable rulers, early technologies, or social structures specific to ${historicalContext.region}. Make it engaging and historically plausible for that time period.

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
