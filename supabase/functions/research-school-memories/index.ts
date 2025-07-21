import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
const serpApiKey = Deno.env.get('SERPAPI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SchoolMemoryRequest {
  schoolName: string;
  city: string;
  graduationYear: number;
  country?: string;
  language?: string;
}

interface SearchResult {
  url: string;
  title: string;
  content: string;
  description?: string;
}

interface ResearchSources {
  schoolWebsite: SearchResult[];
  localNews: SearchResult[];
  historicalRecords: SearchResult[];
  educationalChanges: SearchResult[];
  schoolSearch: SearchResult[];
  totalSourcesFound: number;
  searchQueries: string[];
  firecrawlSuccess: boolean;
  serpApiSuccess: boolean;
}

interface HistoricalHeadline {
  title: string;
  date: string;
  description: string;
  category: 'world' | 'national' | 'local' | 'culture' | 'technology' | 'sports';
  source?: string;
}

// Utility function to clean JSON responses from OpenAI
function cleanJsonResponse(jsonString: string): string {
  console.log('Cleaning JSON response...');
  
  // Remove markdown code blocks if present
  let cleaned = jsonString.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '');
  }
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '');
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\s*```$/, '');
  }
  
  // Fix common JSON issues
  // Remove trailing commas before closing brackets/braces
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix quotes in strings (basic approach)
  cleaned = cleaned.replace(/([{,]\s*\w+):/g, '"$1":');
  
  return cleaned.trim();
}

// International SerpApi Google search for real school data
async function performSerpApiSearch(query: string, limit: number = 5, country?: string, language?: string): Promise<SearchResult[]> {
  if (!serpApiKey) {
    console.log('SerpApi API key not available, skipping search for:', query);
    return [];
  }

  try {
    console.log(`Starting SerpApi Google search for: "${query}" (${country || 'international'})`);
    
    // Determine language and country codes based on input
    const countryMap: Record<string, { gl: string, hl: string }> = {
      'germany': { gl: 'de', hl: 'de' },
      'deutschland': { gl: 'de', hl: 'de' },
      'usa': { gl: 'us', hl: 'en' },
      'uk': { gl: 'uk', hl: 'en' },
      'united kingdom': { gl: 'uk', hl: 'en' },
      'france': { gl: 'fr', hl: 'fr' },
      'spain': { gl: 'es', hl: 'es' },
      'italy': { gl: 'it', hl: 'it' },
      'netherlands': { gl: 'nl', hl: 'nl' },
      'austria': { gl: 'at', hl: 'de' },
      'switzerland': { gl: 'ch', hl: 'de' }
    };
    
    const countryKey = country?.toLowerCase() || 'international';
    const settings = countryMap[countryKey] || { gl: 'us', hl: 'en' }; // Default to US/English
    
    const url = `https://serpapi.com/search?api_key=${serpApiKey}&engine=google&q=${encodeURIComponent(query)}&num=${limit}&hl=${language || settings.hl}&gl=${settings.gl}`;
    
    const response = await fetch(url);
    console.log(`SerpApi search response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SerpApi search failed: ${response.status} - ${errorText}`);
      return [];
    }

    const data = await response.json();
    console.log(`SerpApi search returned ${data.organic_results?.length || 0} results`);
    
    const results: SearchResult[] = [];
    
    if (data.organic_results && Array.isArray(data.organic_results)) {
      for (const result of data.organic_results) {
        if (result.link && result.title && result.snippet) {
          results.push({
            url: result.link,
            title: result.title,
            content: result.snippet,
            description: result.snippet
          });
        }
      }
    }
    
    console.log(`Processed ${results.length} valid results from SerpApi`);
    return results;
  } catch (error) {
    console.error(`SerpApi search error for "${query}":`, error);
    return [];
  }
}

// Enhanced Firecrawl search with better rate limiting
async function performFirecrawlSearch(query: string, limit: number = 3): Promise<SearchResult[]> {
  if (!firecrawlApiKey) {
    console.log('Firecrawl API key not available, skipping search for:', query);
    return [];
  }

  try {
    console.log(`Starting Firecrawl search for: "${query}"`);
    
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        limit: limit
      }),
    });

    console.log(`Firecrawl search response status: ${searchResponse.status}`);
    
    if (searchResponse.status === 429) {
      console.log('Rate limit hit, implementing backoff...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second wait
      return []; // Return empty for this search to avoid cascading failures
    }
    
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error(`Firecrawl search failed: ${searchResponse.status} - ${errorText}`);
      return [];
    }

    const searchData = await searchResponse.json();
    console.log(`Firecrawl search returned ${searchData.data?.length || 0} results`);

    if (searchData.data && Array.isArray(searchData.data)) {
      const results = searchData.data.map((result: any) => ({
        url: result.url || '',
        title: result.title || 'Untitled',
        content: result.content || result.description || '',
        description: result.description || ''
      })).filter((result: SearchResult) => result.url && result.content);

      console.log(`Processed ${results.length} valid results from Firecrawl`);
      return results;
    }

    return [];
  } catch (error) {
    console.error(`Firecrawl search error for "${query}":`, error);
    return [];
  }
}

// Enhanced research strategy focusing on real local data
async function conductComprehensiveResearch(schoolName: string, city: string, graduationYear: number, country?: string, language?: string): Promise<ResearchSources> {
  console.log(`Starting enhanced research for ${schoolName} in ${city}, graduation year ${graduationYear}`);
  
  // Real data source searches for authentic school information
  const searchQueries = [
    // Wayback Machine archived school websites
    `site:web.archive.org "${schoolName}" ${city} school website ${graduationYear}`,
    // School yearbooks and alumni sites  
    `"${schoolName}" ${city} yearbook ${graduationYear} classmates reunion alumni`,
    // Local newspapers and archives
    `site:newspapers.com "${schoolName}" ${city} ${graduationYear} graduation local news`,
    // State education archives and curriculum data
    `"${schoolName}" ${city} curriculum ${graduationYear} education department germany`,
    // NCES equivalent for Germany - statistical offices
    `"${schoolName}" ${city} school statistics profile bildung statistik`,
    // Local school district archives and newsletters
    `"${schoolName}" ${city} school district newsletter ${graduationYear} archive chronik`,
    // Regional historical context and local events
    `${city} ${graduationYear} local news events history regional chronik`,
    // Authentic local business and economic context
    `${city} region wirtschaft unternehmen ${graduationYear} local industry jobs`,
    // Real cultural and social context
    `${city} ${graduationYear} kultur veranstaltungen events festivals local`
  ];

  const sources: ResearchSources = {
    schoolWebsite: [],
    localNews: [],
    historicalRecords: [],
    educationalChanges: [],
    schoolSearch: [],
    totalSourcesFound: 0,
    searchQueries: searchQueries,
    firecrawlSuccess: false,
    serpApiSuccess: false
  };

  // Generate international search queries based on country/language context
  const generateSchoolQueries = (schoolName: string, city: string, graduationYear: number, country?: string) => {
    if (country?.toLowerCase().includes('germany') || country?.toLowerCase().includes('deutschland')) {
      return [
        `"${schoolName}" ${city} schule website`,
        `"${schoolName}" ${city} alumni jahrbuch ${graduationYear}`,
        `"${schoolName}" ${city} graduation abitur ${graduationYear}`
      ];
    } else if (country?.toLowerCase().includes('usa') || country?.toLowerCase().includes('america')) {
      return [
        `"${schoolName}" ${city} school website`,
        `"${schoolName}" ${city} alumni yearbook ${graduationYear}`,
        `"${schoolName}" ${city} graduation class ${graduationYear}`
      ];
    } else if (country?.toLowerCase().includes('uk') || country?.toLowerCase().includes('britain')) {
      return [
        `"${schoolName}" ${city} school website`,
        `"${schoolName}" ${city} alumni ${graduationYear}`,
        `"${schoolName}" ${city} graduation ${graduationYear}`
      ];
    } else {
      // Default international queries
      return [
        `"${schoolName}" ${city} school website`,
        `"${schoolName}" ${city} alumni ${graduationYear}`,
        `"${schoolName}" ${city} graduation ${graduationYear}`
      ];
    }
  };

  const serpApiQueries = generateSchoolQueries(schoolName, city, graduationYear, country);

  for (const query of serpApiQueries) {
    console.log(`Executing SerpApi search: "${query}" (${country || 'international'})`);
    try {
      const results = await performSerpApiSearch(query, 5, country, language);
      if (results.length > 0) {
        sources.serpApiSuccess = true;
        sources.schoolSearch.push(...results);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
      }
    } catch (error) {
      console.error(`SerpApi search failed for "${query}":`, error);
    }
  }

  // Then supplement with Firecrawl for additional context
  for (let i = 0; i < Math.min(searchQueries.length, 4); i++) { // Reduced to 4 since SerpApi provides better data
    const query = searchQueries[i];
    console.log(`Executing Firecrawl search ${i + 1}: "${query}"`);
    
    try {
      const results = await performFirecrawlSearch(query, 2); // Reduced since SerpApi is primary
      
      if (results.length > 0) {
        sources.firecrawlSuccess = true;
        
        // Enhanced categorization for better source attribution
        for (const result of results) {
          const content = (result.title + ' ' + result.content + ' ' + result.url).toLowerCase();
          
          if (content.includes('school') || content.includes('schule') || content.includes('gymnasium') || content.includes('realschule')) {
            sources.schoolWebsite.push(result);
          } else if (content.includes('news') || content.includes('nachrichten') || content.includes('zeitung') || content.includes('presse')) {
            sources.localNews.push(result);
          } else if (content.includes('stadt') || content.includes('gemeinde') || content.includes('city') || content.includes('wikipedia')) {
            sources.historicalRecords.push(result);
          } else if (content.includes('unternehmen') || content.includes('wirtschaft') || content.includes('business') || content.includes('company')) {
            sources.educationalChanges.push(result);
          } else {
            sources.historicalRecords.push(result);
          }
        }
      }
      
      // Add delay between searches to respect rate limits
      if (i < searchQueries.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    } catch (error) {
      console.error(`Search failed for query "${query}":`, error);
    }
  }

  sources.totalSourcesFound = sources.schoolWebsite.length + sources.localNews.length + sources.historicalRecords.length + sources.educationalChanges.length + sources.schoolSearch.length;
  console.log(`Enhanced research completed. Found ${sources.totalSourcesFound} total sources (Google: ${sources.schoolSearch.length}, Schools: ${sources.schoolWebsite.length}, News: ${sources.localNews.length}, Historical: ${sources.historicalRecords.length}, Business: ${sources.educationalChanges.length})`);
  console.log(`Research success: SerpApi=${sources.serpApiSuccess}, Firecrawl=${sources.firecrawlSuccess}`);

  return sources;
}

// Get historical headlines for a specific year
async function getHistoricalHeadlines(year: number): Promise<HistoricalHeadline[]> {
  console.log(`Fetching historical headlines for ${year}`);
  
  if (!openAIApiKey) {
    console.log('OpenAI API key not available for headlines');
    return [];
  }

  try {
    const headlinesPrompt = `Generate 3-4 important historical headlines from ${year} worldwide and in major countries. 
    Focus on events that would have been significant to students graduating that year.
    Return ONLY valid JSON in this format:
    [
      {
        "title": "Headline title",
        "date": "Month ${year}",
        "description": "Brief description of the event",
        "category": "world|national|culture|technology|sports"
      }
    ]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a historical research assistant. Return only valid JSON arrays. No markdown formatting.'
          },
          {
            role: 'user',
            content: headlinesPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      console.error('Headlines API error:', response.status);
      return [];
    }

    const data = await response.json();
    const rawContent = data.choices[0].message.content;
    const cleanedContent = cleanJsonResponse(rawContent);
    
    const headlines = JSON.parse(cleanedContent);
    console.log(`Generated ${headlines.length} historical headlines`);
    return headlines;
  } catch (error) {
    console.error('Error generating headlines:', error);
    return [];
  }
}

// Create enhanced source summary with attribution
function createSourceSummary(sources: ResearchSources): string {
  let summary = '';

  if (sources.schoolSearch.length > 0) {
    summary += '\n=== GOOGLE SEARCH RESULTS (SerpApi) ===\n';
    sources.schoolSearch.forEach(source => {
      summary += `Source: ${source.title} (${source.url})\n`;
      summary += `Content: ${source.content.substring(0, 400)}...\n\n`;
    });
  }

  if (sources.schoolWebsite.length > 0) {
    summary += '\n=== SCHOOL INFORMATION ===\n';
    sources.schoolWebsite.forEach(source => {
      summary += `Source: ${source.title} (${source.url})\n`;
      summary += `Content: ${source.content.substring(0, 400)}...\n\n`;
    });
  }

  if (sources.localNews.length > 0) {
    summary += '\n=== LOCAL NEWS & MEDIA ===\n';
    sources.localNews.forEach(source => {
      summary += `Source: ${source.title} (${source.url})\n`;
      summary += `Content: ${source.content.substring(0, 400)}...\n\n`;
    });
  }

  if (sources.historicalRecords.length > 0) {
    summary += '\n=== HISTORICAL & MUNICIPAL CONTEXT ===\n';
    sources.historicalRecords.forEach(source => {
      summary += `Source: ${source.title} (${source.url})\n`;
      summary += `Content: ${source.content.substring(0, 400)}...\n\n`;
    });
  }

  if (sources.educationalChanges.length > 0) {
    summary += '\n=== LOCAL BUSINESS & ECONOMY ===\n';
    sources.educationalChanges.forEach(source => {
      summary += `Source: ${source.title} (${source.url})\n`;
      summary += `Content: ${source.content.substring(0, 400)}...\n\n`;
    });
  }

  return summary;
}

// Create source attribution object for JSON response
function createSourceAttributions(sources: ResearchSources): any {
  const attributions = [];
  
  [...sources.schoolSearch, ...sources.schoolWebsite, ...sources.localNews, ...sources.historicalRecords, ...sources.educationalChanges]
    .forEach(source => {
      attributions.push({
        title: source.title,
        url: source.url,
        type: sources.schoolSearch.includes(source) ? 'google' :
              sources.schoolWebsite.includes(source) ? 'school' :
              sources.localNews.includes(source) ? 'news' :
              sources.historicalRecords.includes(source) ? 'historical' : 'business'
      });
    });
    
  return attributions;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { schoolName, city, graduationYear, country, language }: SchoolMemoryRequest = await req.json();

    console.log(`=== STARTING ENHANCED SCHOOL MEMORY RESEARCH ===`);
    console.log(`School: ${schoolName}, City: ${city}, Year: ${graduationYear}`);

    // Check for cached data
    const { data: existingData } = await supabase
      .from('school_memories')
      .select('*')
      .eq('school_name', schoolName)
      .eq('city', city)
      .eq('graduation_year', graduationYear)
      .maybeSingle();

    if (existingData) {
      console.log('Found cached school memories data');
      const cacheAge = Math.floor((new Date().getTime() - new Date(existingData.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return new Response(JSON.stringify({
        schoolMemories: existingData.school_memories_data,
        shareableContent: existingData.shareable_content,
        cached: true,
        cacheAge: cacheAge
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('No cached data found, starting research...');

    // Conduct research and get headlines in parallel
    const [researchSources, historicalHeadlines] = await Promise.all([
      conductComprehensiveResearch(schoolName, city, graduationYear, country, language),
      getHistoricalHeadlines(graduationYear)
    ]);

    const sourceSummary = createSourceSummary(researchSources);
    const sourceAttributions = createSourceAttributions(researchSources);

    // Enhanced AI prompt with proper source attribution
    const schoolResearchPrompt = `
You are researching school memories for ${schoolName} in ${city} for someone who graduated in ${graduationYear}.

${researchSources.totalSourcesFound > 0 ? `
REAL SOURCE DATA FOUND (${researchSources.totalSourcesFound} sources):
${sourceSummary}

IMPORTANT: When using real information from the sources above, you MUST include source attribution in the JSON response.
Use the exact URLs and titles provided. Focus on factual, verifiable information from real sources.
` : `
NO REAL SOURCES FOUND - Generate plausible school memories based on typical German school experiences for ${graduationYear}.
Focus on realistic events that would have happened during that time period.
Mark these as generated content without source attribution.
`}

Create detailed content about what happened at the school during graduation year ${graduationYear}.
Include nostalgic memories that graduates would relate to and local context from ${city}.

CRITICAL: Return ONLY valid JSON. No markdown formatting. Include source attribution when using real data.

{
  "whatHappenedAtSchool": [
    {
      "title": "Event Title",
      "description": "Detailed description of what happened",
      "category": "facilities|academics|sports|culture|technology",
      "sourceUrl": "http://example.com",
      "sourceName": "Source Name"
    }
  ],
  "nostalgiaFactors": [
    {
      "memory": "Specific nostalgic memory",
      "shareableText": "Social media friendly version",
      "sourceUrl": "http://example.com",
      "sourceName": "Source Name"
    }
  ],
  "localContext": [
    {
      "event": "Local historical context during graduation year",
      "relevance": "How it affected students and the local community",
      "sourceUrl": "http://example.com",
      "sourceName": "Source Name"
    }
  ],
  "shareableQuotes": [
    "Quote optimized for social sharing"
  ]
}`;

    console.log('Sending request to OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a school memory researcher. Always respond with valid JSON only. No markdown formatting.'
          },
          {
            role: 'user',
            content: schoolResearchPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiData = await response.json();
    console.log('OpenAI response received, parsing...');
    
    // Enhanced JSON parsing with better error handling
    let generatedContent;
    try {
      const rawContent = aiData.choices[0].message.content;
      console.log('Raw AI response length:', rawContent.length);
      
      const cleanContent = cleanJsonResponse(rawContent);
      generatedContent = JSON.parse(cleanContent);
      console.log('Successfully parsed AI response');
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      
      // Fallback: create basic structure
      generatedContent = {
        whatHappenedAtSchool: [{
          title: "Graduation Ceremony",
          description: `The graduation ceremony at ${schoolName} in ${graduationYear} was a memorable event for all students.`,
          category: "culture"
        }],
        nostalgiaFactors: [{
          memory: `Remember the excitement of graduation day at ${schoolName}!`,
          shareableText: `${schoolName} Class of ${graduationYear} - unforgettable memories! 🎓`
        }],
        localContext: [{
          event: `Local events in ${city} during ${graduationYear}`,
          relevance: "These events shaped our school experience"
        }],
        shareableQuotes: [`${schoolName} ${graduationYear} - where memories were made! 🏫`]
      };
    }

    // Create shareable content
    const shareableContent = {
      mainShare: `🎓 ${schoolName} Class of ${graduationYear} memories! Share with your classmates! #${schoolName.replace(/\s+/g, '')}${graduationYear}`,
      whatsappShare: `🏫 Remember ${schoolName} in ${graduationYear}? These were our school days!`,
      instagramStory: `${schoolName} • ${graduationYear}\n\n#ThrowbackThursday #SchoolMemories`,
      twitterPost: `🎓 ${schoolName} ${graduationYear} - who else remembers? #SchoolMemories`,
      variants: generatedContent.shareableQuotes || [],
      historicalHeadlines: historicalHeadlines
    };

    // Store the research data
    const { error: insertError } = await supabase
      .from('school_memories')
      .insert({
        school_name: schoolName,
        city: city,
        graduation_year: graduationYear,
        school_memories_data: generatedContent,
        shareable_content: shareableContent,
        research_sources: {
          generated_at: new Date().toISOString(),
          total_sources_found: researchSources.totalSourcesFound,
          firecrawl_success: researchSources.firecrawlSuccess,
          headlines_count: historicalHeadlines.length
        }
      });

    if (insertError) {
      console.error('Error storing school memories:', insertError);
    } else {
      console.log('Successfully stored school memories data');
    }

    console.log('=== RESEARCH COMPLETED SUCCESSFULLY ===');

    return new Response(JSON.stringify({
      schoolMemories: generatedContent,
      shareableContent: shareableContent,
      historicalHeadlines: historicalHeadlines,
      cached: false,
      researchQuality: {
        totalSourcesFound: researchSources.totalSourcesFound,
        firecrawlWorking: researchSources.firecrawlSuccess,
        headlinesGenerated: historicalHeadlines.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== ERROR IN SCHOOL MEMORY RESEARCH ===');
    console.error('Error details:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Research failed',
      details: error.message,
      fallbackMessage: 'Unable to research school memories at this time. Please try again later.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
