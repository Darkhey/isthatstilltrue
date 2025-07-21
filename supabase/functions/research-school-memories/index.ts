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

interface EnhancedSearchResult extends SearchResult {
  result_type?: 'organic' | 'local_pack' | 'maps' | 'knowledge_graph' | 'news' | 'images' | 'videos' | 'shopping' | 'answer_box' | 'firecrawl';
  snippet?: string;
  rich_snippet?: any;
  thumbnail?: string;
  date?: string;
  position?: number;
  rating?: number;
  price?: string;
  video_length?: string;
  news_source?: string;
}

interface ComprehensiveResearchSources {
  organicResults: EnhancedSearchResult[];
  localPack: EnhancedSearchResult[];
  mapsDetails: EnhancedSearchResult[];
  knowledgeGraph: EnhancedSearchResult[];
  newsResults: EnhancedSearchResult[];
  imagesResults: EnhancedSearchResult[];
  videosResults: EnhancedSearchResult[];
  answerBoxes: EnhancedSearchResult[];
  shoppingResults: EnhancedSearchResult[];
  firecrawlResults: EnhancedSearchResult[];
  schoolImages: EnhancedSearchResult[];
  totalSourcesFound: number;
  searchQueries: string[];
  serpApiEnginesUsed: string[];
  searchMetadata: {
    totalSearches: number;
    successfulSearches: number;
    failedSearches: number;
    processingSearches: number;
    totalProcessingTime: number;
  };
  researchSuccess: {
    organic: boolean;
    localPack: boolean;
    maps: boolean;
    knowledgeGraph: boolean;
    news: boolean;
    images: boolean;
    videos: boolean;
    answerBoxes: boolean;
    shopping: boolean;
    firecrawl: boolean;
    schoolImages: boolean;
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

// Enhanced SerpApi response processor
async function processSerpApiResponse(url: string, searchType: string, retryCount: number = 0): Promise<{ success: boolean; data?: any; error?: string }> {
  const maxRetries = 3;
  const retryDelay = 2000;

  try {
    console.log(`Making SerpApi request (${searchType}): ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SerpApi ${searchType} request failed: ${response.status} - ${errorText}`);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    
    // Check search status
    const searchStatus = data.search_metadata?.status;
    const searchId = data.search_metadata?.id;
    
    console.log(`SerpApi ${searchType} response - Status: ${searchStatus}, ID: ${searchId}`);
    
    if (searchStatus === 'Processing' && retryCount < maxRetries) {
      console.log(`Search still processing (${searchId}), retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return await processSerpApiResponse(url, searchType, retryCount + 1);
    }
    
    if (searchStatus === 'Error' || data.error) {
      const errorMsg = data.error || 'Search failed with error status';
      console.error(`SerpApi ${searchType} error:`, errorMsg);
      return { success: false, error: errorMsg };
    }
    
    if (searchStatus !== 'Success') {
      console.warn(`SerpApi ${searchType} unexpected status: ${searchStatus}`);
    }
    
    return { success: true, data };
  } catch (error) {
    console.error(`SerpApi ${searchType} request error:`, error);
    return { success: false, error: error.message };
  }
}

// Google Inline Images Search for school photos
async function performSchoolImagesSearch(schoolName: string, city: string, country?: string, language?: string): Promise<EnhancedSearchResult[]> {
  if (!serpApiKey) {
    console.log('SerpApi key not available for Google Inline Images search');
    return [];
  }

  try {
    const settings = getCountrySettings(country, language);
    const query = `"${schoolName}" ${city} school building campus`;
    
    console.log(`Google Inline Images search for "${query}" (${country || 'international'})`);
    
    const url = `https://serpapi.com/search?api_key=${serpApiKey}&engine=google&q=${encodeURIComponent(query)}&tbm=isch&hl=${settings.hl}&gl=${settings.gl}&num=6`;
    
    const apiResponse = await processSerpApiResponse(url, 'Google Inline Images');
    
    if (!apiResponse.success || !apiResponse.data) {
      console.log('Google Inline Images search failed');
      return [];
    }

    const data = apiResponse.data;
    console.log(`Google Inline Images search returned ${data.images_results?.length || 0} image results`);
    
    if (data.images_results && Array.isArray(data.images_results)) {
      const schoolImages = data.images_results.slice(0, 3).map((result: any, index: number) => ({
        url: result.original || result.link || '',
        title: result.title || `${schoolName} School Image`,
        content: `School Image: ${result.title || schoolName} - ${city}`,
        description: result.title || `Image of ${schoolName} school`,
        result_type: 'images' as const,
        source_type: 'web' as const,
        thumbnail: result.thumbnail,
        position: index + 1
      })).filter(result => result.url);
      
      console.log(`Processed ${schoolImages.length} school images`);
      return schoolImages;
    }
    
    return [];
  } catch (error) {
    console.error('Google Inline Images search error:', error);
    return [];
  }
}

// Enhanced result processors for different content types
function processOrganicResults(organicResults: any[]): EnhancedSearchResult[] {
  if (!organicResults || !Array.isArray(organicResults)) return [];
  
  return organicResults.slice(0, 8).map((result, index) => ({
    url: result.link || '',
    title: result.title || 'Untitled',
    content: result.snippet || result.rich_snippet?.top?.description || '',
    description: result.snippet,
    result_type: 'organic',
    snippet: result.snippet,
    rich_snippet: result.rich_snippet,
    position: result.position || index + 1,
    source_type: 'web'
  })).filter(result => result.url && result.content);
}

function processNewsResults(newsResults: any[]): EnhancedSearchResult[] {
  if (!newsResults || !Array.isArray(newsResults)) return [];
  
  return newsResults.slice(0, 5).map((result, index) => ({
    url: result.link || '',
    title: result.title || 'Untitled News',
    content: result.snippet || result.summary || '',
    description: result.snippet,
    result_type: 'news',
    date: result.date,
    news_source: result.source,
    thumbnail: result.thumbnail,
    position: index + 1,
    source_type: 'web'
  })).filter(result => result.url && result.content);
}

function processImagesResults(imagesResults: any[]): EnhancedSearchResult[] {
  if (!imagesResults || !Array.isArray(imagesResults)) return [];
  
  return imagesResults.slice(0, 6).map((result, index) => ({
    url: result.original || result.link || '',
    title: result.title || 'School Image',
    content: `Image: ${result.title || 'School related image'}`,
    description: result.title,
    result_type: 'images',
    thumbnail: result.thumbnail,
    position: index + 1,
    source_type: 'web'
  })).filter(result => result.url);
}

function processVideosResults(videosResults: any[]): EnhancedSearchResult[] {
  if (!videosResults || !Array.isArray(videosResults)) return [];
  
  return videosResults.slice(0, 4).map((result, index) => ({
    url: result.link || '',
    title: result.title || 'School Video',
    content: `Video: ${result.title || 'School related video'} ${result.length ? `(${result.length})` : ''}`,
    description: result.snippet || result.title,
    result_type: 'videos',
    thumbnail: result.thumbnail,
    video_length: result.length,
    position: index + 1,
    source_type: 'web'
  })).filter(result => result.url);
}

function processAnswerBoxes(answerBox: any): EnhancedSearchResult[] {
  if (!answerBox) return [];
  
  return [{
    url: answerBox.link || answerBox.source?.link || '',
    title: answerBox.title || 'Direct Answer',
    content: answerBox.answer || answerBox.snippet || '',
    description: answerBox.answer,
    result_type: 'answer_box',
    source_type: 'web'
  }].filter(result => result.content);
}

function processShoppingResults(shoppingResults: any[]): EnhancedSearchResult[] {
  if (!shoppingResults || !Array.isArray(shoppingResults)) return [];
  
  return shoppingResults.slice(0, 3).map((result, index) => ({
    url: result.link || '',
    title: result.title || 'School Item',
    content: `${result.title || 'School related item'} - ${result.price || 'Price not available'}`,
    description: result.snippet,
    result_type: 'shopping',
    price: result.price,
    rating: result.rating,
    thumbnail: result.thumbnail,
    position: index + 1,
    source_type: 'web'
  })).filter(result => result.url);
}

// Enhanced Local Pack Search with comprehensive result processing
async function performEnhancedLocalPackSearch(schoolName: string, city: string, country?: string, language?: string): Promise<{ results: EnhancedSearchResult[], placeIds: string[], dataCids: string[], searchMetadata: any }> {
  if (!serpApiKey) {
    console.log('SerpApi key not available for Enhanced Local Pack search');
    return { results: [], placeIds: [], dataCids: [], searchMetadata: {} };
  }

  try {
    const settings = getCountrySettings(country, language);
    const query = `"${schoolName}" ${city} school`;
    
    console.log(`Enhanced Local Pack search for "${query}" (${country || 'international'})`);
    
    const url = `https://serpapi.com/search?api_key=${serpApiKey}&engine=google&q=${encodeURIComponent(query)}&tbm=lcl&hl=${settings.hl}&gl=${settings.gl}&num=10`;
    
    const apiResponse = await processSerpApiResponse(url, 'Enhanced Local Pack');
    
    if (!apiResponse.success || !apiResponse.data) {
      return { results: [], placeIds: [], dataCids: [], searchMetadata: { error: apiResponse.error } };
    }

    const data = apiResponse.data;
    const searchMetadata = data.search_metadata || {};
    
    console.log(`Enhanced Local Pack search returned ${data.local_results?.length || 0} local results`);
    
    const results: EnhancedSearchResult[] = [];
    const placeIds: string[] = [];
    const dataCids: string[] = [];
    
    if (data.local_results && Array.isArray(data.local_results)) {
      for (const result of data.local_results) {
        if (result.title && result.address) {
          const searchResult: EnhancedSearchResult = {
            url: result.website || `https://maps.google.com/search/${encodeURIComponent(result.title + ' ' + result.address)}`,
            title: result.title,
            content: `${result.address}. ${result.description || ''} Rating: ${result.rating || 'N/A'}/5 (${result.reviews || 0} reviews)`,
            description: result.description,
            result_type: 'local_pack',
            source_type: 'local_pack',
            place_id: result.place_id,
            data_cid: result.data_cid,
            rating: result.rating,
            thumbnail: result.thumbnail
          };
          
          results.push(searchResult);
          
          if (result.place_id) placeIds.push(result.place_id);
          if (result.data_cid) dataCids.push(result.data_cid);
        }
      }
    }
    
    console.log(`Enhanced Local Pack processed: ${results.length} results, ${placeIds.length} place IDs, ${dataCids.length} data CIDs`);
    return { results, placeIds, dataCids, searchMetadata };
  } catch (error) {
    console.error('Enhanced Local Pack search error:', error);
    return { results: [], placeIds: [], dataCids: [], searchMetadata: { error: error.message } };
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

// Enhanced comprehensive web search with all result types
async function performComprehensiveWebSearch(schoolName: string, city: string, graduationYear: number, country?: string, language?: string): Promise<{
  organicResults: EnhancedSearchResult[];
  newsResults: EnhancedSearchResult[];
  imagesResults: EnhancedSearchResult[];
  videosResults: EnhancedSearchResult[];
  answerBoxes: EnhancedSearchResult[];
  shoppingResults: EnhancedSearchResult[];
  searchMetadata: any;
}> {
  if (!serpApiKey) {
    console.log('SerpApi key not available for comprehensive web search');
    return { organicResults: [], newsResults: [], imagesResults: [], videosResults: [], answerBoxes: [], shoppingResults: [], searchMetadata: {} };
  }

  try {
    const settings = getCountrySettings(country, language);
    const results = {
      organicResults: [] as EnhancedSearchResult[],
      newsResults: [] as EnhancedSearchResult[],
      imagesResults: [] as EnhancedSearchResult[],
      videosResults: [] as EnhancedSearchResult[],
      answerBoxes: [] as EnhancedSearchResult[],
      shoppingResults: [] as EnhancedSearchResult[],
      searchMetadata: {} as any
    };
    
    // Generate country-specific queries
    const webQueries = generateHistoricalQueries(schoolName, city, graduationYear, country);
    
    console.log(`Comprehensive web search with ${webQueries.length} queries`);
    
    // Main organic search with all result types
    const mainQuery = webQueries[0];
    const mainUrl = `https://serpapi.com/search?api_key=${serpApiKey}&engine=google&q=${encodeURIComponent(mainQuery)}&hl=${settings.hl}&gl=${settings.gl}&num=10`;
    
    const mainResponse = await processSerpApiResponse(mainUrl, 'Comprehensive Web');
    
    if (mainResponse.success && mainResponse.data) {
      const data = mainResponse.data;
      results.searchMetadata = data.search_metadata || {};
      
      // Process all available result types
      if (data.organic_results) {
        results.organicResults = processOrganicResults(data.organic_results);
        console.log(`Processed ${results.organicResults.length} organic results`);
      }
      
      if (data.news_results) {
        results.newsResults = processNewsResults(data.news_results);
        console.log(`Processed ${results.newsResults.length} news results`);
      }
      
      if (data.images_results) {
        results.imagesResults = processImagesResults(data.images_results);
        console.log(`Processed ${results.imagesResults.length} image results`);
      }
      
      if (data.video_results) {
        results.videosResults = processVideosResults(data.video_results);
        console.log(`Processed ${results.videosResults.length} video results`);
      }
      
      if (data.answer_box) {
        results.answerBoxes = processAnswerBoxes(data.answer_box);
        console.log(`Processed ${results.answerBoxes.length} answer boxes`);
      }
      
      if (data.shopping_results) {
        results.shoppingResults = processShoppingResults(data.shopping_results);
        console.log(`Processed ${results.shoppingResults.length} shopping results`);
      }
    }
    
    // Additional targeted searches for news and images
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Dedicated news search
    const newsQuery = `"${schoolName}" ${city} school news ${graduationYear}`;
    const newsUrl = `https://serpapi.com/search?api_key=${serpApiKey}&engine=google&q=${encodeURIComponent(newsQuery)}&tbm=nws&hl=${settings.hl}&gl=${settings.gl}&num=5`;
    
    const newsResponse = await processSerpApiResponse(newsUrl, 'News Search');
    if (newsResponse.success && newsResponse.data?.news_results) {
      const additionalNews = processNewsResults(newsResponse.data.news_results);
      results.newsResults = [...results.newsResults, ...additionalNews].slice(0, 8);
      console.log(`Added ${additionalNews.length} additional news results`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Dedicated image search
    const imagesQuery = `"${schoolName}" ${city} school building campus`;
    const imagesUrl = `https://serpapi.com/search?api_key=${serpApiKey}&engine=google&q=${encodeURIComponent(imagesQuery)}&tbm=isch&hl=${settings.hl}&gl=${settings.gl}&num=8`;
    
    const imagesResponse = await processSerpApiResponse(imagesUrl, 'Images Search');
    if (imagesResponse.success && imagesResponse.data?.images_results) {
      const additionalImages = processImagesResults(imagesResponse.data.images_results);
      results.imagesResults = [...results.imagesResults, ...additionalImages].slice(0, 10);
      console.log(`Added ${additionalImages.length} additional image results`);
    }
    
    console.log(`Comprehensive web search completed: ${results.organicResults.length} organic, ${results.newsResults.length} news, ${results.imagesResults.length} images, ${results.videosResults.length} videos`);
    return results;
  } catch (error) {
    console.error('Comprehensive web search error:', error);
    return { organicResults: [], newsResults: [], imagesResults: [], videosResults: [], answerBoxes: [], shoppingResults: [], searchMetadata: { error: error.message } };
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

// Enhanced master research function with comprehensive result processing
async function conductComprehensiveMultiEngineResearch(schoolName: string, city: string, graduationYear: number, country?: string, language?: string): Promise<ComprehensiveResearchSources> {
  console.log(`=== STARTING COMPREHENSIVE MULTI-ENGINE SERPAPI RESEARCH ===`);
  console.log(`School: ${schoolName}, City: ${city}, Year: ${graduationYear}, Country: ${country || 'international'}`);
  
  const sources: ComprehensiveResearchSources = {
    organicResults: [],
    localPack: [],
    mapsDetails: [],
    knowledgeGraph: [],
    newsResults: [],
    imagesResults: [],
    videosResults: [],
    answerBoxes: [],
    shoppingResults: [],
    firecrawlResults: [],
    schoolImages: [],
    totalSourcesFound: 0,
    searchQueries: [],
    serpApiEnginesUsed: [],
    searchMetadata: {
      totalSearches: 0,
      successfulSearches: 0,
      failedSearches: 0,
      processingSearches: 0,
      totalProcessingTime: 0
    },
    researchSuccess: {
      organic: false,
      localPack: false,
      maps: false,
      knowledgeGraph: false,
      news: false,
      images: false,
      videos: false,
      answerBoxes: false,
      shopping: false,
      firecrawl: false,
      schoolImages: false
    }
  };

  try {
    // Phase 1: Enhanced Local Pack Search
    console.log('\n--- PHASE 1: ENHANCED LOCAL PACK SEARCH ---');
    const localPackResult = await performEnhancedLocalPackSearch(schoolName, city, country, language);
    sources.localPack = localPackResult.results;
    sources.researchSuccess.localPack = localPackResult.results.length > 0;
    if (sources.researchSuccess.localPack) sources.serpApiEnginesUsed.push('google_local');
    sources.searchMetadata.totalSearches++;
    if (localPackResult.searchMetadata.error) sources.searchMetadata.failedSearches++;
    else sources.searchMetadata.successfulSearches++;
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Phase 2: Maps Detail Search (unchanged)
    console.log('\n--- PHASE 2: MAPS DETAIL SEARCH ---');
    const mapsResults = await performMapsDetailSearch(localPackResult.dataCids, country, language);
    sources.mapsDetails = mapsResults.map(r => ({ ...r, result_type: 'maps' as const }));
    sources.researchSuccess.maps = mapsResults.length > 0;
    if (sources.researchSuccess.maps) sources.serpApiEnginesUsed.push('google_maps');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Phase 3: Knowledge Graph Search (unchanged)
    console.log('\n--- PHASE 3: KNOWLEDGE GRAPH SEARCH ---');
    const kgmids = sources.mapsDetails.map(r => r.kgmid).filter(Boolean) as string[];
    const knowledgeResults = await performKnowledgeGraphSearch(kgmids, schoolName, city, country, language);
    sources.knowledgeGraph = knowledgeResults.map(r => ({ ...r, result_type: 'knowledge_graph' as const }));
    sources.researchSuccess.knowledgeGraph = knowledgeResults.length > 0;
    if (sources.researchSuccess.knowledgeGraph) sources.serpApiEnginesUsed.push('google_knowledge');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Phase 4: Google Inline Images Search for school photos
    console.log('\n--- PHASE 4: GOOGLE INLINE IMAGES SEARCH ---');
    const schoolImages = await performSchoolImagesSearch(schoolName, city, country, language);
    sources.schoolImages = schoolImages;
    sources.researchSuccess.schoolImages = schoolImages.length > 0;
    if (sources.researchSuccess.schoolImages) sources.serpApiEnginesUsed.push('google_images');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Phase 5: Comprehensive Web Search with all result types
    console.log('\n--- PHASE 5: COMPREHENSIVE WEB SEARCH ---');
    const webResults = await performComprehensiveWebSearch(schoolName, city, graduationYear, country, language);
    sources.organicResults = webResults.organicResults;
    sources.newsResults = webResults.newsResults;
    sources.imagesResults = webResults.imagesResults;
    sources.videosResults = webResults.videosResults;
    sources.answerBoxes = webResults.answerBoxes;
    sources.shoppingResults = webResults.shoppingResults;
    
    sources.researchSuccess.organic = webResults.organicResults.length > 0;
    sources.researchSuccess.news = webResults.newsResults.length > 0;
    sources.researchSuccess.images = webResults.imagesResults.length > 0;
    sources.researchSuccess.videos = webResults.videosResults.length > 0;
    sources.researchSuccess.answerBoxes = webResults.answerBoxes.length > 0;
    sources.researchSuccess.shopping = webResults.shoppingResults.length > 0;
    
    if (sources.researchSuccess.organic || sources.researchSuccess.news) sources.serpApiEnginesUsed.push('google_web');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Phase 6: Supplementary Firecrawl Search (unchanged)
    console.log('\n--- PHASE 6: FIRECRAWL SUPPLEMENT ---');
    const firecrawlQuery = `"${schoolName}" ${city} school ${graduationYear} history`;
    const firecrawlResults = await performFirecrawlSearch(firecrawlQuery, 2);
    sources.firecrawlResults = firecrawlResults.map(r => ({ ...r, result_type: 'firecrawl' as const }));
    sources.researchSuccess.firecrawl = firecrawlResults.length > 0;

    // Calculate totals
    sources.totalSourcesFound = sources.organicResults.length + sources.localPack.length + 
                               sources.mapsDetails.length + sources.knowledgeGraph.length + 
                               sources.newsResults.length + sources.imagesResults.length +
                               sources.videosResults.length + sources.answerBoxes.length +
                               sources.shoppingResults.length + sources.firecrawlResults.length +
                               sources.schoolImages.length;

    sources.searchQueries = generateHistoricalQueries(schoolName, city, graduationYear, country);

    console.log('\n=== COMPREHENSIVE MULTI-ENGINE RESEARCH COMPLETED ===');
    console.log(`Total sources found: ${sources.totalSourcesFound}`);
    console.log(`Organic: ${sources.organicResults.length}, Local: ${sources.localPack.length}, Maps: ${sources.mapsDetails.length}, Knowledge: ${sources.knowledgeGraph.length}`);
    console.log(`News: ${sources.newsResults.length}, Images: ${sources.imagesResults.length}, Videos: ${sources.videosResults.length}, Answers: ${sources.answerBoxes.length}, Shopping: ${sources.shoppingResults.length}`);
    console.log(`School Images: ${sources.schoolImages.length}, Firecrawl: ${sources.firecrawlResults.length}`);
    console.log(`Engines used: ${sources.serpApiEnginesUsed.join(', ')}`);

    return sources;
  } catch (error) {
    console.error('Comprehensive multi-engine research error:', error);
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

// Enhanced source summary with comprehensive result types
function createComprehensiveSourceSummary(sources: ComprehensiveResearchSources): string {
  let summary = '';

  if (sources.answerBoxes.length > 0) {
    summary += '\n=== DIRECT ANSWER BOXES ===\n';
    sources.answerBoxes.forEach(source => {
      summary += `Source: ${source.title} (${source.url})\n`;
      summary += `Answer: ${source.content.substring(0, 300)}...\n\n`;
    });
  }

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

  if (sources.knowledgeGraph.length > 0) {
    summary += '\n=== KNOWLEDGE GRAPH RESULTS (Official Information) ===\n';
    sources.knowledgeGraph.forEach(source => {
      summary += `Source: ${source.title} (${source.url})\n`;
      summary += `Content: ${source.content.substring(0, 400)}...\n\n`;
    });
  }

  if (sources.newsResults.length > 0) {
    summary += '\n=== NEWS RESULTS (Recent Articles) ===\n';
    sources.newsResults.forEach(source => {
      summary += `Source: ${source.title} (${source.url})\n`;
      summary += `Date: ${source.date || 'Unknown'}\n`;
      summary += `News Source: ${source.news_source || 'Unknown'}\n`;
      summary += `Content: ${source.content.substring(0, 400)}...\n\n`;
    });
  }

  if (sources.organicResults.length > 0) {
    summary += '\n=== ORGANIC WEB RESULTS ===\n';
    sources.organicResults.forEach(source => {
      summary += `Source: ${source.title} (${source.url})\n`;
      summary += `Position: ${source.position || 'Unknown'}\n`;
      summary += `Content: ${source.content.substring(0, 400)}...\n\n`;
    });
  }

  if (sources.imagesResults.length > 0) {
    summary += '\n=== IMAGE RESULTS (Visual Content) ===\n';
    sources.imagesResults.forEach(source => {
      summary += `Image: ${source.title} (${source.url})\n`;
      summary += `Description: ${source.content}\n\n`;
    });
  }

  if (sources.videosResults.length > 0) {
    summary += '\n=== VIDEO RESULTS (Visual Content) ===\n';
    sources.videosResults.forEach(source => {
      summary += `Video: ${source.title} (${source.url})\n`;
      summary += `Length: ${source.video_length || 'Unknown'}\n`;
      summary += `Description: ${source.content}\n\n`;
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

  if (sources.firecrawlResults.length > 0) {
    summary += '\n=== FIRECRAWL SUPPLEMENT ===\n';
    sources.firecrawlResults.forEach(source => {
      summary += `Source: ${source.title} (${source.url})\n`;
      summary += `Content: ${source.content.substring(0, 400)}...\n\n`;
    });
  }

  return summary;
}

// Enhanced source attribution with comprehensive result types
function createComprehensiveSourceAttributions(sources: ComprehensiveResearchSources): any {
  const attributions = [];
  
  [...sources.answerBoxes, ...sources.organicResults, ...sources.localPack, ...sources.mapsDetails, 
   ...sources.knowledgeGraph, ...sources.newsResults, ...sources.imagesResults, ...sources.videosResults,
   ...sources.shoppingResults, ...sources.firecrawlResults]
    .forEach(source => {
      attributions.push({
        title: source.title,
        url: source.url,
        type: source.result_type || source.source_type || 'unknown',
        place_id: source.place_id,
        data_cid: source.data_cid,
        kgmid: source.kgmid,
        position: source.position,
        date: source.date,
        news_source: source.news_source,
        rating: source.rating,
        price: source.price,
        video_length: source.video_length,
        thumbnail: source.thumbnail
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

    console.log(`=== STARTING COMPREHENSIVE MULTI-ENGINE SCHOOL RESEARCH ===`);
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

    console.log('No cached data found, starting comprehensive multi-engine research...');

    // Conduct comprehensive multi-engine research and get headlines in parallel
    const [researchSources, historicalHeadlines] = await Promise.all([
      conductComprehensiveMultiEngineResearch(schoolName, city, graduationYear, country, language),
      getHistoricalHeadlines(graduationYear)
    ]);

    const sourceSummary = createComprehensiveSourceSummary(researchSources);
    const sourceAttributions = createComprehensiveSourceAttributions(researchSources);

    // Enhanced AI prompt with comprehensive multi-engine source attribution
    const schoolResearchPrompt = `
You are researching school memories for ${schoolName} in ${city} for someone who graduated in ${graduationYear}.

${researchSources.totalSourcesFound > 0 ? `
COMPREHENSIVE MULTI-ENGINE REAL SOURCE DATA FOUND (${researchSources.totalSourcesFound} sources from ${researchSources.serpApiEnginesUsed.length} engines):
Engines used: ${researchSources.serpApiEnginesUsed.join(', ')}

RESULT BREAKDOWN:
- Direct Answers: ${researchSources.answerBoxes.length}
- Local Pack: ${researchSources.localPack.length}
- Knowledge Graph: ${researchSources.knowledgeGraph.length}
- News Articles: ${researchSources.newsResults.length}
- Organic Web: ${researchSources.organicResults.length}
- Images: ${researchSources.imagesResults.length}
- Videos: ${researchSources.videosResults.length}
- Shopping: ${researchSources.shoppingResults.length}

${sourceSummary}

IMPORTANT: When using real information from the sources above, you MUST include source attribution in the JSON response.
Prioritize Direct Answer Boxes and Knowledge Graph for authoritative information.
Use Local Pack and Maps for location-specific details.
Incorporate News results for recent events and historical context.
Consider Images and Videos for visual references to the school environment.
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
      "sourceType": "organic|local_pack|maps|knowledge_graph|news|images|videos|answer_box|firecrawl"
    }
  ],
  "nostalgiaFactors": [
    {
      "memory": "Specific nostalgic memory",
      "shareableText": "Social media friendly version",
      "sourceUrl": "http://example.com",
      "sourceName": "Source Name",
      "sourceType": "organic|local_pack|maps|knowledge_graph|news|images|videos|answer_box|firecrawl"
    }
  ],
  "localContext": [
    {
      "event": "Local historical context during graduation year",
      "relevance": "How it affected students and the local community",
      "sourceUrl": "http://example.com",
      "sourceName": "Source Name",
      "sourceType": "organic|local_pack|maps|knowledge_graph|news|images|videos|answer_box|firecrawl"
    }
  ],
  "shareableQuotes": [
    "Quote optimized for social sharing"
  ]
}`;

    console.log('Sending comprehensive multi-engine request to OpenAI...');

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

    // Store the enhanced research data in cache
    const { error: insertError } = await supabase
      .from('school_research_cache')
      .insert({
        school_name: schoolName,
        city: city,
        graduation_year: graduationYear,
        country: country,
        research_results: generatedContent,
        shareable_content: shareableContent,
        historical_headlines: historicalHeadlines,
        research_sources: {
          generated_at: new Date().toISOString(),
          total_sources_found: researchSources.totalSourcesFound,
          engines_used: researchSources.serpApiEnginesUsed,
          research_success: researchSources.researchSuccess,
          search_metadata: researchSources.searchMetadata,
          source_breakdown: {
            organic: researchSources.organicResults.length,
            local_pack: researchSources.localPack.length,
            maps: researchSources.mapsDetails.length,
            knowledge_graph: researchSources.knowledgeGraph.length,
            news: researchSources.newsResults.length,
            images: researchSources.imagesResults.length,
            videos: researchSources.videosResults.length,
            answer_boxes: researchSources.answerBoxes.length,
            shopping: researchSources.shoppingResults.length,
            firecrawl: researchSources.firecrawlResults.length,
            schoolImages: researchSources.schoolImages.length
          },
          headlines_count: historicalHeadlines.length
        }
      });

    if (insertError) {
      console.error('Error storing school memories:', insertError);
    } else {
      console.log('Successfully stored enhanced school memories data');
    }

    console.log('=== COMPREHENSIVE MULTI-ENGINE RESEARCH COMPLETED SUCCESSFULLY ===');

    return new Response(JSON.stringify({
      schoolMemories: generatedContent,
      shareableContent: shareableContent,
      historicalHeadlines: historicalHeadlines,
      cached: false,
      researchResults: {
        schoolImages: researchSources.schoolImages
      },
      researchQuality: {
        totalSourcesFound: researchSources.totalSourcesFound,
        enginesUsed: researchSources.serpApiEnginesUsed,
        researchSuccess: researchSources.researchSuccess,
        searchMetadata: researchSources.searchMetadata,
        sourceBreakdown: {
          organic: researchSources.organicResults.length,
          localPack: researchSources.localPack.length,
          maps: researchSources.mapsDetails.length,
          knowledgeGraph: researchSources.knowledgeGraph.length,
          news: researchSources.newsResults.length,
          images: researchSources.imagesResults.length,
          videos: researchSources.videosResults.length,
          answerBoxes: researchSources.answerBoxes.length,
          shopping: researchSources.shoppingResults.length,
          firecrawl: researchSources.firecrawlResults.length,
          schoolImages: researchSources.schoolImages.length
        },
        headlinesGenerated: historicalHeadlines.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== ERROR IN COMPREHENSIVE MULTI-ENGINE SCHOOL RESEARCH ===');
    console.error('Error details:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Comprehensive multi-engine research failed',
      details: error.message,
      fallbackMessage: 'Unable to research school memories at this time. Please try again later.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
