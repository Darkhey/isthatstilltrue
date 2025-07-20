
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SchoolMemoryRequest {
  schoolName: string;
  city: string;
  graduationYear: number;
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
  totalSourcesFound: number;
  searchQueries: string[];
  firecrawlSuccess: boolean;
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

// Optimized research strategy with fewer simultaneous requests
async function conductComprehensiveResearch(schoolName: string, city: string, graduationYear: number): Promise<ResearchSources> {
  console.log(`Starting optimized research for ${schoolName} in ${city}, graduation year ${graduationYear}`);
  
  // Reduced and prioritized search queries
  const searchQueries = [
    `"${schoolName}" ${city} school official website`,
    `${schoolName} ${city} school history ${graduationYear}`,
    `${city} school news ${graduationYear} graduation`,
    `${city} local news ${graduationYear}`,
    `Germany education ${graduationYear} changes`
  ];

  const sources: ResearchSources = {
    schoolWebsite: [],
    localNews: [],
    historicalRecords: [],
    educationalChanges: [],
    totalSourcesFound: 0,
    searchQueries: searchQueries,
    firecrawlSuccess: false
  };

  // Sequential searches with delays to respect rate limits
  for (let i = 0; i < Math.min(searchQueries.length, 3); i++) { // Limit to 3 searches
    const query = searchQueries[i];
    console.log(`Executing search ${i + 1}: "${query}"`);
    
    try {
      const results = await performFirecrawlSearch(query, 2); // Reduce results per query
      
      if (results.length > 0) {
        sources.firecrawlSuccess = true;
        
        // Simple categorization
        for (const result of results) {
          const content = (result.title + ' ' + result.content).toLowerCase();
          
          if (content.includes('school') || content.includes('schule')) {
            sources.schoolWebsite.push(result);
          } else if (content.includes('news') || content.includes('nachrichten')) {
            sources.localNews.push(result);
          } else {
            sources.historicalRecords.push(result);
          }
        }
      }
      
      // Add delay between searches
      if (i < searchQueries.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 second delay
      }
    } catch (error) {
      console.error(`Search failed for query "${query}":`, error);
    }
  }

  sources.totalSourcesFound = sources.schoolWebsite.length + sources.localNews.length + sources.historicalRecords.length;
  console.log(`Optimized research completed. Found ${sources.totalSourcesFound} total sources`);

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
    const headlinesPrompt = `Generate 3-4 important historical headlines from ${year} in Germany and worldwide. 
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

// Create source summary for AI prompt
function createSourceSummary(sources: ResearchSources): string {
  let summary = '';

  if (sources.schoolWebsite.length > 0) {
    summary += '\n=== SCHOOL INFORMATION ===\n';
    sources.schoolWebsite.forEach(source => {
      summary += `Source: ${source.title} (${source.url})\n`;
      summary += `Content: ${source.content.substring(0, 300)}...\n\n`;
    });
  }

  if (sources.localNews.length > 0) {
    summary += '\n=== LOCAL NEWS ===\n';
    sources.localNews.forEach(source => {
      summary += `Source: ${source.title} (${source.url})\n`;
      summary += `Content: ${source.content.substring(0, 300)}...\n\n`;
    });
  }

  if (sources.historicalRecords.length > 0) {
    summary += '\n=== HISTORICAL CONTEXT ===\n';
    sources.historicalRecords.forEach(source => {
      summary += `Source: ${source.title} (${source.url})\n`;
      summary += `Content: ${source.content.substring(0, 300)}...\n\n`;
    });
  }

  return summary;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { schoolName, city, graduationYear }: SchoolMemoryRequest = await req.json();

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
      conductComprehensiveResearch(schoolName, city, graduationYear),
      getHistoricalHeadlines(graduationYear)
    ]);

    const sourceSummary = createSourceSummary(researchSources);

    // Enhanced AI prompt with better error handling
    const schoolResearchPrompt = `
You are researching school memories for ${schoolName} in ${city} for someone who graduated in ${graduationYear}.

${researchSources.totalSourcesFound > 0 ? `
REAL SOURCE DATA FOUND:
${sourceSummary}

Use the real information above when possible and mark with source references.
` : `
NO REAL SOURCES FOUND - Generate plausible school memories based on typical German school experiences for ${graduationYear}.
Focus on realistic events that would have happened during that time period.
`}

Create content about what happened at the school during graduation year ${graduationYear}.
Include nostalgic memories that graduates would relate to.

CRITICAL: Return ONLY valid JSON. No markdown formatting.

{
  "whatHappenedAtSchool": [
    {
      "title": "Event Title",
      "description": "Detailed description of what happened",
      "category": "facilities"
    }
  ],
  "nostalgiaFactors": [
    {
      "memory": "Specific nostalgic memory",
      "shareableText": "Social media friendly version"
    }
  ],
  "localContext": [
    {
      "event": "Local context during graduation year",
      "relevance": "How it affected students"
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
