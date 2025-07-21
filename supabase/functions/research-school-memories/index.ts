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
  source_type?: 'local_pack' | 'maps' | 'knowledge_graph' | 'web' | 'firecrawl';
  place_id?: string;
  data_cid?: string;
  kgmid?: string;
}

interface LocalPackResult {
  title: string;
  address: string;
  phone?: string;
  website?: string;
  place_id: string;
  data_cid?: string;
  rating?: number;
  reviews?: number;
  description?: string;
}

interface MapsResult {
  title: string;
  address: string;
  phone?: string;
  website?: string;
  description?: string;
  rating?: number;
  reviews?: number;
  hours?: string;
  data_cid: string;
  kgmid?: string;
}

interface ResearchSources {
  localPack: SearchResult[];
  mapsDetails: SearchResult[];
  knowledgeGraph: SearchResult[];
  webSearch: SearchResult[];
  firecrawlResults: SearchResult[];
  totalSourcesFound: number;
  searchQueries: string[];
  serpApiEnginesUsed: string[];
  researchSuccess: {
    localPack: boolean;
    maps: boolean;
    knowledgeGraph: boolean;
    webSearch: boolean;
    firecrawl: boolean;
  };
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
  
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  cleaned = cleaned.replace(/([{,]\s*\w+):/g, '"$1":');
  
  return cleaned.trim();
}

// Get country-specific SerpApi parameters
function getCountrySettings(country?: string, language?: string): { gl: string, hl: string } {
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
  const settings = countryMap[countryKey] || { gl: 'us', hl: 'en' };
  
  if (language) {
    settings.hl = language;
  }
  
  return settings;
}

// Phase 1: Local Pack Search for school locations
async function performLocalPackSearch(schoolName: string, city: string, country?: string, language?: string): Promise<{ results: SearchResult[], placeIds: string[], dataCids: string[] }> {
  if (!serpApiKey) {
    console.log('SerpApi key not available for Local Pack search');
    return { results: [], placeIds: [], dataCids: [] };
  }

  try {
    const settings = getCountrySettings(country, language);
    const query = `"${schoolName}" ${city} school`;
    
    console.log(`Phase 1: Local Pack search for "${query}" (${country || 'international'})`);
    
    const url = `https://serpapi.com/search?api_key=${serpApiKey}&engine=google&q=${encodeURIComponent(query)}&tbm=lcl&hl=${settings.hl}&gl=${settings.gl}&num=10`;
    
    const response = await fetch(url);
    console.log(`Local Pack search response: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Local Pack search failed: ${response.status} - ${errorText}`);
      return { results: [], placeIds: [], dataCids: [] };
    }

    const data = await response.json();
    console.log(`Local Pack search returned ${data.local_results?.length || 0} results`);
    
    const results: SearchResult[] = [];
    const placeIds: string[] = [];
    const dataCids: string[] = [];
    
    if (data.local_results && Array.isArray(data.local_results)) {
      for (const result of data.local_results) {
        if (result.title && result.address) {
          const searchResult: SearchResult = {
            url: result.website || `https://maps.google.com/search/${encodeURIComponent(result.title + ' ' + result.address)}`,
            title: result.title,
            content: `${result.address}. ${result.description || ''} Rating: ${result.rating || 'N/A'}/5 (${result.reviews || 0} reviews)`,
            description: result.description,
            source_type: 'local_pack',
            place_id: result.place_id,
            data_cid: result.data_cid
          };
          
          results.push(searchResult);
          
          if (result.place_id) placeIds.push(result.place_id);
          if (result.data_cid) dataCids.push(result.data_cid);
        }
      }
    }
    
    console.log(`Local Pack processed: ${results.length} results, ${placeIds.length} place IDs, ${dataCids.length} data CIDs`);
    return { results, placeIds, dataCids };
  } catch (error) {
    console.error('Local Pack search error:', error);
    return { results: [], placeIds: [], dataCids: [] };
  }
}

// Phase 2: Maps Detail Search using found CIDs
async function performMapsDetailSearch(dataCids: string[], country?: string, language?: string): Promise<SearchResult[]> {
  if (!serpApiKey || dataCids.length === 0) {
    console.log('No data CIDs available for Maps detail search');
    return [];
  }

  try {
    const settings = getCountrySettings(country, language);
    const results: SearchResult[] = [];
    
    console.log(`Phase 2: Maps detail search for ${dataCids.length} locations`);
    
    for (const dataCid of dataCids.slice(0, 3)) { // Limit to 3 to avoid rate limits
      const url = `https://serpapi.com/search?api_key=${serpApiKey}&engine=google_maps&data_cid=${dataCid}&hl=${settings.hl}&gl=${settings.gl}`;
      
      const response = await fetch(url);
      console.log(`Maps detail search for CID ${dataCid}: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.place_results) {
          const place = data.place_results;
          const searchResult: SearchResult = {
            url: place.website || `https://maps.google.com/search/?data_cid=${dataCid}`,
            title: place.title || 'School Details',
            content: `${place.address || ''}. ${place.description || ''} Hours: ${place.hours || 'N/A'} Rating: ${place.rating || 'N/A'}/5 (${place.reviews || 0} reviews)`,
            description: place.description,
            source_type: 'maps',
            data_cid: dataCid,
            kgmid: place.kgmid
          };
          
          results.push(searchResult);
        }
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`Maps detail search processed: ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Maps detail search error:', error);
    return [];
  }
}

// Phase 3: Knowledge Graph Search using KGMIDs
async function performKnowledgeGraphSearch(kgmids: string[], schoolName: string, city: string, country?: string, language?: string): Promise<SearchResult[]> {
  if (!serpApiKey) {
    console.log('SerpApi key not available for Knowledge Graph search');
    return [];
  }

  try {
    const settings = getCountrySettings(country, language);
    const results: SearchResult[] = [];
    
    console.log(`Phase 3: Knowledge Graph search for ${kgmids.length} KGMIDs + general search`);
    
    // Search with KGMIDs if available
    for (const kgmid of kgmids.slice(0, 2)) { // Limit to avoid rate limits
      const url = `https://serpapi.com/search?api_key=${serpApiKey}&engine=google&kgmid=${kgmid}&hl=${settings.hl}&gl=${settings.gl}`;
      
      const response = await fetch(url);
      console.log(`Knowledge Graph search for KGMID ${kgmid}: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.knowledge_graph) {
          const kg = data.knowledge_graph;
          const searchResult: SearchResult = {
            url: kg.website || kg.source?.link || `https://www.google.com/search?kgmid=${kgmid}`,
            title: kg.title || 'Knowledge Graph Entry',
            content: `${kg.description || ''} ${kg.type || ''} Founded: ${kg.founded || 'N/A'}`,
            description: kg.description,
            source_type: 'knowledge_graph',
            kgmid: kgmid
          };
          
          results.push(searchResult);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // General Knowledge Graph search for the school
    const generalQuery = `"${schoolName}" ${city} school wikipedia`;
    const generalUrl = `https://serpapi.com/search?api_key=${serpApiKey}&engine=google&q=${encodeURIComponent(generalQuery)}&hl=${settings.hl}&gl=${settings.gl}`;
    
    const generalResponse = await fetch(generalUrl);
    console.log(`General Knowledge Graph search: ${generalResponse.status}`);
    
    if (generalResponse.ok) {
      const generalData = await generalResponse.json();
      
      if (generalData.knowledge_graph) {
        const kg = generalData.knowledge_graph;
        const searchResult: SearchResult = {
          url: kg.website || kg.source?.link || generalData.search_metadata?.google_url || '',
          title: kg.title || 'General Knowledge Graph',
          content: `${kg.description || ''} ${kg.type || ''}`,
          description: kg.description,
          source_type: 'knowledge_graph'
        };
        
        results.push(searchResult);
      }
    }
    
    console.log(`Knowledge Graph search processed: ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Knowledge Graph search error:', error);
    return [];
  }
}

// Phase 4: Enhanced Web Search for historical context
async function performEnhancedWebSearch(schoolName: string, city: string, graduationYear: number, country?: string, language?: string): Promise<SearchResult[]> {
  if (!serpApiKey) {
    console.log('SerpApi key not available for web search');
    return [];
  }

  try {
    const settings = getCountrySettings(country, language);
    const results: SearchResult[] = [];
    
    // Country-specific historical queries
    const webQueries = generateHistoricalQueries(schoolName, city, graduationYear, country);
    
    console.log(`Phase 4: Enhanced web search with ${webQueries.length} queries`);
    
    for (const query of webQueries.slice(0, 4)) { // Limit to 4 queries
      const url = `https://serpapi.com/search?api_key=${serpApiKey}&engine=google&q=${encodeURIComponent(query)}&hl=${settings.hl}&gl=${settings.gl}&num=5`;
      
      const response = await fetch(url);
      console.log(`Web search for "${query}": ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.organic_results && Array.isArray(data.organic_results)) {
          for (const result of data.organic_results.slice(0, 3)) {
            if (result.link && result.title && result.snippet) {
              const searchResult: SearchResult = {
                url: result.link,
                title: result.title,
                content: result.snippet,
                description: result.snippet,
                source_type: 'web'
              };
              
              results.push(searchResult);
            }
          }
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`Enhanced web search processed: ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Enhanced web search error:', error);
    return [];
  }
}

// Generate country-specific historical queries
function generateHistoricalQueries(schoolName: string, city: string, graduationYear: number, country?: string): string[] {
  if (country?.toLowerCase().includes('germany') || country?.toLowerCase().includes('deutschland')) {
    return [
      `"${schoolName}" ${city} geschichte chronik ${graduationYear}`,
      `"${schoolName}" ${city} abitur jahrbuch ${graduationYear}`,
      `${city} schulgeschichte bildung ${graduationYear} gymnasium`,
      `"${schoolName}" ${city} alumni ehemaliger schüler ${graduationYear}`
    ];
  } else if (country?.toLowerCase().includes('usa') || country?.toLowerCase().includes('america')) {
    return [
      `"${schoolName}" ${city} history yearbook ${graduationYear}`,
      `"${schoolName}" ${city} graduation class ${graduationYear}`,
      `${city} school district history ${graduationYear}`,
      `"${schoolName}" ${city} alumni reunion ${graduationYear}`
    ];
  } else if (country?.toLowerCase().includes('uk') || country?.toLowerCase().includes('britain')) {
    return [
      `"${schoolName}" ${city} history ${graduationYear} school`,
      `"${schoolName}" ${city} pupils graduation ${graduationYear}`,
      `${city} education history ${graduationYear}`,
      `"${schoolName}" ${city} former pupils ${graduationYear}`
    ];
  } else {
    // International default
    return [
      `"${schoolName}" ${city} history ${graduationYear} school`,
      `"${schoolName}" ${city} graduation ${graduationYear}`,
      `${city} education ${graduationYear} students`,
      `"${schoolName}" ${city} alumni ${graduationYear}`
    ];
  }
}

// Enhanced Firecrawl search (unchanged from previous version)
async function performFirecrawlSearch(query: string, limit: number = 3): Promise<SearchResult[]> {
  if (!firecrawlApiKey) {
    console.log('Firecrawl API key not available, skipping search for:', query);
    return [];
  }

  try {
    console.log(`Firecrawl search for: "${query}"`);
    
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
      await new Promise(resolve => setTimeout(resolve, 2000));
      return [];
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
        description: result.description || '',
        source_type: 'firecrawl' as const
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

// Master research function implementing the 4-phase strategy
async function conductMultiEngineResearch(schoolName: string, city: string, graduationYear: number, country?: string, language?: string): Promise<ResearchSources> {
  console.log(`=== STARTING MULTI-ENGINE SERPAPI RESEARCH ===`);
  console.log(`School: ${schoolName}, City: ${city}, Year: ${graduationYear}, Country: ${country || 'international'}`);
  
  const sources: ResearchSources = {
    localPack: [],
    mapsDetails: [],
    knowledgeGraph: [],
    webSearch: [],
    firecrawlResults: [],
    totalSourcesFound: 0,
    searchQueries: [],
    serpApiEnginesUsed: [],
    researchSuccess: {
      localPack: false,
      maps: false,
      knowledgeGraph: false,
      webSearch: false,
      firecrawl: false
    }
  };

  try {
    // Phase 1: Local Pack Search
    console.log('\n--- PHASE 1: LOCAL PACK SEARCH ---');
    const localPackResult = await performLocalPackSearch(schoolName, city, country, language);
    sources.localPack = localPackResult.results;
    sources.researchSuccess.localPack = localPackResult.results.length > 0;
    if (sources.researchSuccess.localPack) sources.serpApiEnginesUsed.push('google_local');
    
    await new Promise(resolve => setTimeout(resolve, 1500)); // Rate limiting between phases

    // Phase 2: Maps Detail Search using found CIDs
    console.log('\n--- PHASE 2: MAPS DETAIL SEARCH ---');
    const mapsResults = await performMapsDetailSearch(localPackResult.dataCids, country, language);
    sources.mapsDetails = mapsResults;
    sources.researchSuccess.maps = mapsResults.length > 0;
    if (sources.researchSuccess.maps) sources.serpApiEnginesUsed.push('google_maps');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Phase 3: Knowledge Graph Search using KGMIDs
    console.log('\n--- PHASE 3: KNOWLEDGE GRAPH SEARCH ---');
    const kgmids = mapsResults.map(r => r.kgmid).filter(Boolean) as string[];
    const knowledgeResults = await performKnowledgeGraphSearch(kgmids, schoolName, city, country, language);
    sources.knowledgeGraph = knowledgeResults;
    sources.researchSuccess.knowledgeGraph = knowledgeResults.length > 0;
    if (sources.researchSuccess.knowledgeGraph) sources.serpApiEnginesUsed.push('google_knowledge');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Phase 4: Enhanced Web Search
    console.log('\n--- PHASE 4: ENHANCED WEB SEARCH ---');
    const webResults = await performEnhancedWebSearch(schoolName, city, graduationYear, country, language);
    sources.webSearch = webResults;
    sources.researchSuccess.webSearch = webResults.length > 0;
    if (sources.researchSuccess.webSearch) sources.serpApiEnginesUsed.push('google_web');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Phase 5: Supplementary Firecrawl Search
    console.log('\n--- PHASE 5: FIRECRAWL SUPPLEMENT ---');
    const firecrawlQuery = `"${schoolName}" ${city} school ${graduationYear} history`;
    const firecrawlResults = await performFirecrawlSearch(firecrawlQuery, 2);
    sources.firecrawlResults = firecrawlResults;
    sources.researchSuccess.firecrawl = firecrawlResults.length > 0;

    // Calculate totals
    sources.totalSourcesFound = sources.localPack.length + sources.mapsDetails.length + 
                               sources.knowledgeGraph.length + sources.webSearch.length + 
                               sources.firecrawlResults.length;

    sources.searchQueries = generateHistoricalQueries(schoolName, city, graduationYear, country);

    console.log('\n=== MULTI-ENGINE RESEARCH COMPLETED ===');
    console.log(`Total sources found: ${sources.totalSourcesFound}`);
    console.log(`Local Pack: ${sources.localPack.length}, Maps: ${sources.mapsDetails.length}, Knowledge: ${sources.knowledgeGraph.length}, Web: ${sources.webSearch.length}, Firecrawl: ${sources.firecrawlResults.length}`);
    console.log(`Engines used: ${sources.serpApiEnginesUsed.join(', ')}`);
    console.log(`Research success: ${Object.entries(sources.researchSuccess).filter(([_, success]) => success).map(([engine, _]) => engine).join(', ')}`);

    return sources;
  } catch (error) {
    console.error('Multi-engine research error:', error);
    return sources;
  }
}

// Get historical headlines for a specific year (unchanged)
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

// Create enhanced source summary with multi-engine attribution
function createSourceSummary(sources: ResearchSources): string {
  let summary = '';

  if (sources.localPack.length > 0) {
    summary += '\n=== LOCAL PACK RESULTS (Google Local) ===\n';
    sources.localPack.forEach(source => {
      summary += `Source: ${source.title} (${source.url})\n`;
      summary += `Content: ${source.content.substring(0, 400)}...\n`;
      if (source.place_id) summary += `Place ID: ${source.place_id}\n`;
      if (source.data_cid) summary += `Data CID: ${source.data_cid}\n`;
      summary += '\n';
    });
  }

  if (sources.mapsDetails.length > 0) {
    summary += '\n=== MAPS DETAIL RESULTS (Google Maps) ===\n';
    sources.mapsDetails.forEach(source => {
      summary += `Source: ${source.title} (${source.url})\n`;
      summary += `Content: ${source.content.substring(0, 400)}...\n`;
      if (source.data_cid) summary += `Data CID: ${source.data_cid}\n`;
      if (source.kgmid) summary += `KGMID: ${source.kgmid}\n`;
      summary += '\n';
    });
  }

  if (sources.knowledgeGraph.length > 0) {
    summary += '\n=== KNOWLEDGE GRAPH RESULTS (Google Knowledge) ===\n';
    sources.knowledgeGraph.forEach(source => {
      summary += `Source: ${source.title} (${source.url})\n`;
      summary += `Content: ${source.content.substring(0, 400)}...\n`;
      if (source.kgmid) summary += `KGMID: ${source.kgmid}\n`;
      summary += '\n';
    });
  }

  if (sources.webSearch.length > 0) {
    summary += '\n=== WEB SEARCH RESULTS (Google Web) ===\n';
    sources.webSearch.forEach(source => {
      summary += `Source: ${source.title} (${source.url})\n`;
      summary += `Content: ${source.content.substring(0, 400)}...\n\n`;
    });
  }

  if (sources.firecrawlResults.length > 0) {
    summary += '\n=== FIRECRAWL SUPPLEMENT ===\n';
    sources.firecrawlResults.forEach(source => {
      summary += `Source: ${source.title} (${source.url})\n`;
      summary += `Content: ${source.content.substring(0, 400)}...\n\n`;
    });
  }

  return summary;
}

// Create enhanced source attribution object for JSON response
function createSourceAttributions(sources: ResearchSources): any {
  const attributions = [];
  
  [...sources.localPack, ...sources.mapsDetails, ...sources.knowledgeGraph, ...sources.webSearch, ...sources.firecrawlResults]
    .forEach(source => {
      attributions.push({
        title: source.title,
        url: source.url,
        type: source.source_type || 'unknown',
        place_id: source.place_id,
        data_cid: source.data_cid,
        kgmid: source.kgmid
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

    console.log(`=== STARTING ENHANCED MULTI-ENGINE SCHOOL RESEARCH ===`);
    console.log(`School: ${schoolName}, City: ${city}, Year: ${graduationYear}, Country: ${country || 'international'}, Language: ${language || 'auto'}`);

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

    console.log('No cached data found, starting multi-engine research...');

    // Conduct multi-engine research and get headlines in parallel
    const [researchSources, historicalHeadlines] = await Promise.all([
      conductMultiEngineResearch(schoolName, city, graduationYear, country, language),
      getHistoricalHeadlines(graduationYear)
    ]);

    const sourceSummary = createSourceSummary(researchSources);
    const sourceAttributions = createSourceAttributions(researchSources);

    // Enhanced AI prompt with multi-engine source attribution
    const schoolResearchPrompt = `
You are researching school memories for ${schoolName} in ${city} for someone who graduated in ${graduationYear}.

${researchSources.totalSourcesFound > 0 ? `
MULTI-ENGINE REAL SOURCE DATA FOUND (${researchSources.totalSourcesFound} sources from ${researchSources.serpApiEnginesUsed.length} engines):
Engines used: ${researchSources.serpApiEnginesUsed.join(', ')}

${sourceSummary}

IMPORTANT: When using real information from the sources above, you MUST include source attribution in the JSON response.
Use the exact URLs and titles provided. Prioritize data from Local Pack and Maps results as they are most accurate for location-specific information.
Knowledge Graph results provide official/authoritative information. Web search provides historical context.
` : `
NO REAL SOURCES FOUND - Generate plausible school memories based on typical school experiences for ${graduationYear} in ${country || 'international context'}.
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
      "sourceName": "Source Name",
      "sourceType": "local_pack|maps|knowledge_graph|web|firecrawl"
    }
  ],
  "nostalgiaFactors": [
    {
      "memory": "Specific nostalgic memory",
      "shareableText": "Social media friendly version",
      "sourceUrl": "http://example.com",
      "sourceName": "Source Name",
      "sourceType": "local_pack|maps|knowledge_graph|web|firecrawl"
    }
  ],
  "localContext": [
    {
      "event": "Local historical context during graduation year",
      "relevance": "How it affected students and the local community",
      "sourceUrl": "http://example.com",
      "sourceName": "Source Name",
      "sourceType": "local_pack|maps|knowledge_graph|web|firecrawl"
    }
  ],
  "shareableQuotes": [
    "Quote optimized for social sharing"
  ]
}`;

    console.log('Sending enhanced multi-engine request to OpenAI...');

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
            content: 'You are a school memory researcher with access to multi-engine search data. Always respond with valid JSON only. No markdown formatting.'
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

    // Store the enhanced research data
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
          engines_used: researchSources.serpApiEnginesUsed,
          research_success: researchSources.researchSuccess,
          local_pack_results: researchSources.localPack.length,
          maps_results: researchSources.mapsDetails.length,
          knowledge_graph_results: researchSources.knowledgeGraph.length,
          web_results: researchSources.webSearch.length,
          firecrawl_results: researchSources.firecrawlResults.length,
          headlines_count: historicalHeadlines.length
        }
      });

    if (insertError) {
      console.error('Error storing school memories:', insertError);
    } else {
      console.log('Successfully stored enhanced school memories data');
    }

    console.log('=== MULTI-ENGINE RESEARCH COMPLETED SUCCESSFULLY ===');

    return new Response(JSON.stringify({
      schoolMemories: generatedContent,
      shareableContent: shareableContent,
      historicalHeadlines: historicalHeadlines,
      cached: false,
      researchQuality: {
        totalSourcesFound: researchSources.totalSourcesFound,
        enginesUsed: researchSources.serpApiEnginesUsed,
        researchSuccess: researchSources.researchSuccess,
        sourceBreakdown: {
          localPack: researchSources.localPack.length,
          maps: researchSources.mapsDetails.length,
          knowledgeGraph: researchSources.knowledgeGraph.length,
          web: researchSources.webSearch.length,
          firecrawl: researchSources.firecrawlResults.length
        },
        headlinesGenerated: historicalHeadlines.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== ERROR IN MULTI-ENGINE SCHOOL RESEARCH ===');
    console.error('Error details:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Multi-engine research failed',
      details: error.message,
      fallbackMessage: 'Unable to research school memories at this time. Please try again later.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
