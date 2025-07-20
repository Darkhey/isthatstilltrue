
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

// Enhanced Firecrawl search function with multiple strategies
async function performFirecrawlSearch(query: string, limit: number = 5): Promise<SearchResult[]> {
  if (!firecrawlApiKey) {
    console.log('Firecrawl API key not available, skipping search for:', query);
    return [];
  }

  try {
    console.log(`Starting Firecrawl search for: "${query}"`);
    
    // Try the search endpoint first
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        limit: limit,
        search_depth: 'basic'
      }),
    });

    console.log(`Firecrawl search response status: ${searchResponse.status}`);
    
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

// Multi-source research strategy
async function conductComprehensiveResearch(schoolName: string, city: string, graduationYear: number): Promise<ResearchSources> {
  console.log(`Starting comprehensive research for ${schoolName} in ${city}, graduation year ${graduationYear}`);
  
  const searchQueries = [
    // School-specific searches
    `"${schoolName}" ${city} school website official`,
    `"${schoolName}" ${city} school history`,
    `${schoolName} ${city} school ${graduationYear}`,
    
    // Local news and events
    `${schoolName} ${city} ${graduationYear} graduation news`,
    `${city} school news ${graduationYear}`,
    `${city} education ${graduationYear} changes`,
    
    // Historical context
    `${city} ${graduationYear} local events history`,
    `${city} newspaper ${graduationYear} school`,
    
    // Educational changes
    `Germany education system ${graduationYear} changes`,
    `school curriculum changes ${graduationYear}`,
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

  // Perform searches in batches to avoid rate limiting
  for (let i = 0; i < searchQueries.length; i++) {
    const query = searchQueries[i];
    console.log(`Executing search ${i + 1}/${searchQueries.length}: "${query}"`);
    
    try {
      const results = await performFirecrawlSearch(query, 3);
      
      if (results.length > 0) {
        sources.firecrawlSuccess = true;
        
        // Categorize results based on content and URL
        for (const result of results) {
          const url = result.url.toLowerCase();
          const content = (result.title + ' ' + result.content).toLowerCase();
          
          if (content.includes(schoolName.toLowerCase()) && (url.includes('school') || content.includes('school'))) {
            sources.schoolWebsite.push(result);
          } else if (url.includes('news') || url.includes('zeitung') || content.includes('news') || content.includes('artikel')) {
            sources.localNews.push(result);
          } else if (content.includes('history') || content.includes('geschichte') || url.includes('archive')) {
            sources.historicalRecords.push(result);
          } else if (content.includes('education') || content.includes('bildung') || content.includes('curriculum')) {
            sources.educationalChanges.push(result);
          } else {
            // Default to school website if unsure
            sources.schoolWebsite.push(result);
          }
        }
      }
      
      // Add small delay between searches to be respectful to the API
      if (i < searchQueries.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`Search failed for query "${query}":`, error);
    }
  }

  // Remove duplicates based on URL
  const deduplicateResults = (results: SearchResult[]) => {
    const seen = new Set<string>();
    return results.filter(result => {
      if (seen.has(result.url)) return false;
      seen.add(result.url);
      return true;
    });
  };

  sources.schoolWebsite = deduplicateResults(sources.schoolWebsite);
  sources.localNews = deduplicateResults(sources.localNews);
  sources.historicalRecords = deduplicateResults(sources.historicalRecords);
  sources.educationalChanges = deduplicateResults(sources.educationalChanges);

  sources.totalSourcesFound = sources.schoolWebsite.length + sources.localNews.length + 
                             sources.historicalRecords.length + sources.educationalChanges.length;

  console.log(`Research completed. Found ${sources.totalSourcesFound} total sources:
    - School website: ${sources.schoolWebsite.length}
    - Local news: ${sources.localNews.length}
    - Historical records: ${sources.historicalRecords.length}
    - Educational changes: ${sources.educationalChanges.length}`);

  return sources;
}

// Create source summary for AI prompt
function createSourceSummary(sources: ResearchSources): string {
  let summary = '';

  if (sources.schoolWebsite.length > 0) {
    summary += '\n=== SCHOOL OFFICIAL INFORMATION ===\n';
    sources.schoolWebsite.forEach(source => {
      summary += `Source: ${source.title} (${source.url})\n`;
      summary += `Content: ${source.content.substring(0, 400)}...\n\n`;
    });
  }

  if (sources.localNews.length > 0) {
    summary += '\n=== LOCAL NEWS AND ARTICLES ===\n';
    sources.localNews.forEach(source => {
      summary += `Source: ${source.title} (${source.url})\n`;
      summary += `Content: ${source.content.substring(0, 400)}...\n\n`;
    });
  }

  if (sources.historicalRecords.length > 0) {
    summary += '\n=== HISTORICAL RECORDS ===\n';
    sources.historicalRecords.forEach(source => {
      summary += `Source: ${source.title} (${source.url})\n`;
      summary += `Content: ${source.content.substring(0, 400)}...\n\n`;
    });
  }

  if (sources.educationalChanges.length > 0) {
    summary += '\n=== EDUCATIONAL CHANGES AND CONTEXT ===\n';
    sources.educationalChanges.forEach(source => {
      summary += `Source: ${source.title} (${source.url})\n`;
      summary += `Content: ${source.content.substring(0, 400)}...\n\n`;
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

    console.log(`=== STARTING SCHOOL MEMORY RESEARCH ===`);
    console.log(`School: ${schoolName}`);
    console.log(`City: ${city}`);
    console.log(`Graduation Year: ${graduationYear}`);
    console.log(`Firecrawl API Available: ${!!firecrawlApiKey}`);
    console.log(`OpenAI API Available: ${!!openAIApiKey}`);

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

    console.log('No cached data found, starting comprehensive research...');

    // Conduct comprehensive research
    const researchSources = await conductComprehensiveResearch(schoolName, city, graduationYear);
    const sourceSummary = createSourceSummary(researchSources);

    console.log(`Research phase completed. Total sources found: ${researchSources.totalSourcesFound}`);

    // Enhanced AI prompt with real source data
    const schoolResearchPrompt = `
You are researching school memories for ${schoolName} in ${city} for someone who graduated in ${graduationYear}.

${researchSources.totalSourcesFound > 0 ? `
REAL SOURCE DATA FOUND:
${sourceSummary}

IMPORTANT INSTRUCTIONS:
- Use ONLY the real information provided above from actual sources
- When referencing information from a source, include the exact sourceUrl and sourceName provided
- If you cannot find specific information about an event in the sources, clearly mark it as "Plausible scenario based on typical experiences" and do not provide a sourceUrl
- Prioritize information that comes from official school sources or local news articles
- Be specific about which source provided which information
` : `
NO REAL SOURCES FOUND - GENERATE PLAUSIBLE CONTENT:
Since no real sources were found for this specific school and year, generate plausible content based on typical German school experiences for ${graduationYear}.
Mark all content as AI-generated and do not provide fake sourceUrl values.
Focus on creating realistic scenarios that would have been common during that time period.
`}

Create content in these categories:
1. "What Happened at Your School That Year" - specific events, changes, or notable occurrences during ${graduationYear}
2. School-specific nostalgia triggers and memories
3. Local historical context relevant to the school and graduation year
4. Educational system changes or trends during that time period

CRITICAL: Return ONLY valid JSON. No markdown formatting or explanatory text.

Response format:
{
  "whatHappenedAtSchool": [
    {
      "title": "Event Title",
      "description": "Detailed description",
      "category": "facilities|academics|sports|culture|technology",
      "sourceUrl": "ONLY include if you have a real source URL from the data above",
      "sourceName": "ONLY include if you have a real source name from the data above"
    }
  ],
  "nostalgiaFactors": [
    {
      "memory": "Specific nostalgic memory",
      "shareableText": "Text optimized for social sharing",
      "sourceUrl": "ONLY include if you have a real source URL",
      "sourceName": "ONLY include if you have a real source name"
    }
  ],
  "localContext": [
    {
      "event": "Local historical event or context",
      "relevance": "How it affected the school/students",
      "sourceUrl": "ONLY include if you have a real source URL",
      "sourceName": "ONLY include if you have a real source name"
    }
  ],
  "shareableQuotes": [
    "Quote 1 optimized for social media sharing",
    "Quote 2 with engaging format for sharing"
  ],
  "dataQuality": {
    "realSourcesFound": ${researchSources.totalSourcesFound},
    "confidenceLevel": "${researchSources.totalSourcesFound > 3 ? 'high' : researchSources.totalSourcesFound > 0 ? 'medium' : 'low'}",
    "sourcesBreakdown": {
      "schoolWebsite": ${researchSources.schoolWebsite.length},
      "localNews": ${researchSources.localNews.length},
      "historicalRecords": ${researchSources.historicalRecords.length},
      "educationalChanges": ${researchSources.educationalChanges.length}
    }
  }
}
    `;

    console.log('Sending enhanced prompt to OpenAI...');
    console.log(`Prompt length: ${schoolResearchPrompt.length} characters`);

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
            content: 'You are an expert researcher specializing in educational history and school memories. Always respond with valid JSON only, no markdown formatting. Only include sourceUrl and sourceName when you have real, verified sources from the provided data.'
          },
          {
            role: 'user',
            content: schoolResearchPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const aiData = await response.json();
    console.log('OpenAI response received, parsing content...');
    
    // Enhanced JSON parsing with better error handling
    let generatedContent;
    try {
      const rawContent = aiData.choices[0].message.content;
      console.log('Raw AI response preview:', rawContent.substring(0, 300) + '...');
      
      // Clean up the response if it has markdown formatting
      let cleanContent = rawContent.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '');
      }
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '');
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.replace(/\s*```$/, '');
      }
      
      generatedContent = JSON.parse(cleanContent);
      console.log('Successfully parsed AI response');
      console.log(`Data quality: ${generatedContent.dataQuality?.confidenceLevel || 'unknown'} confidence`);
      console.log(`Real sources used: ${generatedContent.dataQuality?.realSourcesFound || 0}`);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Raw content that failed to parse:', aiData.choices[0].message.content);
      throw new Error('AI response was not valid JSON');
    }

    // Create enhanced shareable content
    const shareableContent = {
      mainShare: `🎓 Remember ${schoolName} in ${graduationYear}? Here's what was happening at our school that year! ${researchSources.totalSourcesFound > 0 ? 'Based on real sources!' : ''} #${schoolName.replace(/\s+/g, '')}Memories #ClassOf${graduationYear}`,
      whatsappShare: `🏫 ${schoolName} ${graduationYear} memories! ${researchSources.totalSourcesFound > 0 ? 'Found some real info about our school days!' : 'Remember these times?'} Share with your classmates!`,
      instagramStory: `${schoolName} • Class of ${graduationYear}\n\nThrowback to our school days 📚\n\n#TBT #SchoolMemories #ClassOf${graduationYear}`,
      twitterPost: `🎓 ${schoolName} Class of ${graduationYear} - who else remembers these school days? ${researchSources.totalSourcesFound > 0 ? 'Found some real memories!' : ''} Tag your classmates! #SchoolMemories #${graduationYear}Nostalgia`,
      variants: generatedContent.shareableQuotes || []
    };

    // Store the enhanced research data
    const { data: insertedData, error: insertError } = await supabase
      .from('school_memories')
      .insert({
        school_name: schoolName,
        city: city,
        graduation_year: graduationYear,
        school_memories_data: generatedContent,
        shareable_content: shareableContent,
        research_sources: {
          generated_at: new Date().toISOString(),
          method: researchSources.firecrawlSuccess ? 'real_sources_with_ai' : 'ai_generated_only',
          total_sources_found: researchSources.totalSourcesFound,
          sources_breakdown: generatedContent.dataQuality?.sourcesBreakdown || {},
          search_queries: researchSources.searchQueries,
          confidence_level: generatedContent.dataQuality?.confidenceLevel || 'low',
          firecrawl_success: researchSources.firecrawlSuccess
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing school memories:', insertError);
    } else {
      console.log('Successfully stored school memories data');
    }

    console.log('=== RESEARCH COMPLETED SUCCESSFULLY ===');
    console.log(`Total real sources found: ${researchSources.totalSourcesFound}`);
    console.log(`Confidence level: ${generatedContent.dataQuality?.confidenceLevel || 'unknown'}`);

    return new Response(JSON.stringify({
      schoolMemories: generatedContent,
      shareableContent: shareableContent,
      cached: false,
      researchQuality: {
        totalSourcesFound: researchSources.totalSourcesFound,
        confidenceLevel: generatedContent.dataQuality?.confidenceLevel || 'low',
        firecrawlWorking: researchSources.firecrawlSuccess
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== ERROR IN SCHOOL MEMORY RESEARCH ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to research school memories',
      details: 'Check the Edge Function logs for more information'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
