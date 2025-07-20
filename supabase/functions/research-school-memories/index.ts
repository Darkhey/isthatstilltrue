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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { schoolName, city, graduationYear }: SchoolMemoryRequest = await req.json();

    console.log(`Researching school memories for ${schoolName} in ${city}, graduation year ${graduationYear}`);

    // Check if we already have data for this school/year combination
    const { data: existingData } = await supabase
      .from('school_memories')
      .select('*')
      .eq('school_name', schoolName)
      .eq('city', city)
      .eq('graduation_year', graduationYear)
      .maybeSingle();

    if (existingData) {
      console.log('Found cached school memories data');
      return new Response(JSON.stringify({
        schoolMemories: existingData.school_memories_data,
        shareableContent: existingData.shareable_content,
        cached: true,
        cacheAge: Math.floor((new Date().getTime() - new Date(existingData.created_at).getTime()) / (1000 * 60 * 60 * 24))
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try to scrape school website with Firecrawl if API key is available
    let scrapedContent = '';
    if (firecrawlApiKey) {
      try {
        console.log(`Attempting to scrape school website for ${schoolName}`);
        const searchQuery = `${schoolName} ${city} school website`;
        
        // Use Firecrawl to search and scrape relevant school information
        const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: searchQuery,
            limit: 3,
            search_depth: 'basic'
          }),
        });

        if (firecrawlResponse.ok) {
          const firecrawlData = await firecrawlResponse.json();
          if (firecrawlData.data && firecrawlData.data.length > 0) {
            scrapedContent = firecrawlData.data
              .map((result: any) => `${result.title}: ${result.content?.substring(0, 500)}`)
              .join('\n\n');
            console.log('Successfully scraped school website content');
          }
        }
      } catch (error) {
        console.warn('Firecrawl scraping failed, continuing with AI-only generation:', error);
      }
    }

    // Helper function to extract and parse JSON from potentially markdown-wrapped responses
    const extractJsonFromResponse = (content: string) => {
      console.log('Raw OpenAI response content:', content.substring(0, 200) + '...');
      
      try {
        // First, try direct parsing
        return JSON.parse(content);
      } catch (directParseError) {
        console.log('Direct JSON parse failed, trying to extract from markdown...');
        
        try {
          // Remove markdown code block markers
          let cleanedContent = content.trim();
          
          // Remove ```json and ``` markers
          if (cleanedContent.startsWith('```json')) {
            cleanedContent = cleanedContent.replace(/^```json\s*/, '');
          }
          if (cleanedContent.startsWith('```')) {
            cleanedContent = cleanedContent.replace(/^```\s*/, '');
          }
          if (cleanedContent.endsWith('```')) {
            cleanedContent = cleanedContent.replace(/\s*```$/, '');
          }
          
          // Try parsing the cleaned content
          const parsed = JSON.parse(cleanedContent.trim());
          console.log('Successfully extracted JSON from markdown wrapper');
          return parsed;
        } catch (markdownParseError) {
          console.error('Failed to parse JSON even after markdown cleanup:', markdownParseError);
          
          // Try to find JSON object in the content
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const extracted = JSON.parse(jsonMatch[0]);
              console.log('Successfully extracted JSON using regex');
              return extracted;
            } catch (regexParseError) {
              console.error('Regex-extracted JSON is also invalid:', regexParseError);
            }
          }
          
          // If all parsing fails, throw the original error with context
          throw new Error(`Failed to parse OpenAI response as JSON. Original content: ${content.substring(0, 500)}...`);
        }
      }
    };

    // Generate AI-powered school research
    const schoolResearchPrompt = `
      Research and generate personalized school memories for ${schoolName} in ${city} for someone who graduated in ${graduationYear}.

      ${scrapedContent ? `Here is some real information about the school from web sources:\n${scrapedContent}\n\nUse this information to make your response more accurate and specific to this actual school.` : ''}

      Create content in these categories:
      1. "What Happened at Your School That Year" - specific events, changes, or notable occurrences during ${graduationYear}
      2. School-specific nostalgia triggers and memories
      3. Local historical context relevant to the school and graduation year
      4. Educational system changes or trends during that time period
      5. Pop culture and world events that would have affected students in ${graduationYear}

      Focus on creating shareable, nostalgic content that would resonate with graduates from that specific school and year.
      Be creative but plausible - if specific information isn't available, generate realistic scenarios based on typical school experiences of that era.

      IMPORTANT: Return ONLY the JSON object, no markdown formatting or explanatory text.

      Respond in JSON format:
      {
        "whatHappenedAtSchool": [
          {
            "title": "Event Title",
            "description": "Detailed description",
            "category": "facilities|academics|sports|culture|technology",
            "sourceUrl": "URL to relevant source (school website, news article, etc.)",
            "sourceName": "Name of the source"
          }
        ],
        "nostalgiaFactors": [
          {
            "memory": "Specific nostalgic memory",
            "shareableText": "Text optimized for social sharing",
            "sourceUrl": "URL to relevant source if available",
            "sourceName": "Name of the source if available"
          }
        ],
        "localContext": [
          {
            "event": "Local historical event or context",
            "relevance": "How it affected the school/students",
            "sourceUrl": "URL to relevant source (news, historical records, etc.)",
            "sourceName": "Name of the source"
          }
        ],
        "shareableQuotes": [
          "Quote 1 optimized for social media",
          "Quote 2 with hashtags and engaging format"
        ]
      }
    `;

    console.log('Sending request to OpenAI for school memories generation...');
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
            content: 'You are an expert researcher specializing in educational history and school memories. Always respond with valid JSON only, no markdown formatting or explanatory text.'
          },
          {
            role: 'user',
            content: schoolResearchPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const aiData = await response.json();
    console.log('OpenAI response received, parsing content...');
    
    const generatedContent = extractJsonFromResponse(aiData.choices[0].message.content);

    // Create shareable content variants
    const shareableContent = {
      mainShare: `🎓 Remember ${schoolName} in ${graduationYear}? Here's what was happening at our school that year! #${schoolName.replace(/\s+/g, '')}Memories #ClassOf${graduationYear}`,
      whatsappShare: `🏫 ${schoolName} ${graduationYear} memories! Remember these times? Share with your classmates!`,
      instagramStory: `${schoolName} • Class of ${graduationYear}\n\nThrowback to our school days 📚\n\n#TBT #SchoolMemories #ClassOf${graduationYear}`,
      twitterPost: `🎓 ${schoolName} Class of ${graduationYear} - who else remembers these school days? Tag your classmates! #SchoolMemories #${graduationYear}Nostalgia`,
      variants: generatedContent.shareableQuotes || []
    };

    // Store the generated data
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
          method: firecrawlApiKey ? 'ai_with_web_scraping' : 'ai_generated',
          school_query: `${schoolName} ${city} ${graduationYear}`,
          scraped_content_available: !!scrapedContent
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing school memories:', insertError);
      // Continue anyway and return the generated data
    }

    return new Response(JSON.stringify({
      schoolMemories: generatedContent,
      shareableContent: shareableContent,
      cached: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in research-school-memories function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to research school memories'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});