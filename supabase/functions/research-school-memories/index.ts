import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
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

    // Generate AI-powered school research
    const schoolResearchPrompt = `
      Research and generate personalized school memories for ${schoolName} in ${city} for someone who graduated in ${graduationYear}.

      Create content in these categories:
      1. "What Happened at Your School That Year" - specific events, changes, or notable occurrences during ${graduationYear}
      2. School-specific nostalgia triggers and memories
      3. Local historical context relevant to the school and graduation year
      4. Educational system changes or trends during that time period
      5. Pop culture and world events that would have affected students in ${graduationYear}

      Focus on creating shareable, nostalgic content that would resonate with graduates from that specific school and year.
      Be creative but plausible - if specific information isn't available, generate realistic scenarios based on typical school experiences of that era.

      Respond in JSON format:
      {
        "whatHappenedAtSchool": [
          {
            "title": "Event Title",
            "description": "Detailed description",
            "category": "facilities|academics|sports|culture|technology"
          }
        ],
        "nostalgiaFactors": [
          {
            "memory": "Specific nostalgic memory",
            "shareableText": "Text optimized for social sharing"
          }
        ],
        "localContext": [
          {
            "event": "Local historical event or context",
            "relevance": "How it affected the school/students"
          }
        ],
        "shareableQuotes": [
          "Quote 1 optimized for social media",
          "Quote 2 with hashtags and engaging format"
        ]
      }
    `;

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
            content: 'You are an expert researcher specializing in educational history and school memories. Generate engaging, nostalgic content that encourages social sharing.'
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
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const generatedContent = JSON.parse(aiData.choices[0].message.content);

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
          method: 'ai_generated',
          school_query: `${schoolName} ${city} ${graduationYear}`
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