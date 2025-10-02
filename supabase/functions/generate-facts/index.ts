import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Wikipedia RAG helper for context retrieval
async function getWikipediaContext(country: string, year: number): Promise<string> {
  try {
    const topics = [
      `${country} education history ${year}`,
      `Science education ${year}`,
      `List of common misconceptions`
    ];
    
    const contexts: string[] = [];
    
    for (const topic of topics.slice(0, 2)) {
      try {
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&origin=*&srlimit=1`;
        const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(5000) });
        const searchData = await searchRes.json();
        
        if (searchData.query?.search?.[0]) {
          const pageTitle = searchData.query.search[0].title;
          const contentUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=extracts&exintro=true&explaintext=true&format=json&origin=*`;
          const contentRes = await fetch(contentUrl, { signal: AbortSignal.timeout(5000) });
          const contentData = await contentRes.json();
          
          const pages = contentData.query?.pages;
          const pageId = Object.keys(pages)[0];
          if (pages[pageId]?.extract) {
            contexts.push(pages[pageId].extract.substring(0, 600));
          }
        }
      } catch (err) {
        console.log(`Wikipedia fetch failed for ${topic}:`, err.message);
      }
    }
    
    return contexts.join('\n\n') || 'No Wikipedia context available';
  } catch (error) {
    console.error('Wikipedia context error:', error);
    return 'No Wikipedia context available';
  }
}

// Timeout wrapper for fetch requests
async function fetchWithTimeout(url: string, options: any, timeoutMs: number = 25000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { country, graduationYear, language = 'en' } = await req.json();
    
    console.log('Received request:', { country, graduationYear, language });

    if (!country || !graduationYear) {
      return new Response(
        JSON.stringify({ error: 'Country and graduation year are required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Check cache first
    console.log('Checking cache...');
    const { data: cachedData } = await supabase
      .from('cached_facts')
      .select('*')
      .eq('country', country)
      .eq('graduation_year', graduationYear)
      .maybeSingle();

    if (cachedData) {
      const cacheAge = Math.floor((new Date().getTime() - new Date(cachedData.created_at).getTime()) / (1000 * 60 * 60 * 24));
      console.log(`Cache hit! Age: ${cacheAge} days`);
      
      return new Response(JSON.stringify({
        facts: cachedData.facts_data,
        educationProblems: cachedData.education_system_problems || [],
        cached: true,
        cacheAge
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Cache miss, generating with RAG system...');
    
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Fetch Wikipedia context for RAG
    console.log('Fetching Wikipedia context...');
    const wikiContext = await getWikipediaContext(country, graduationYear);
    console.log('Wikipedia context retrieved:', wikiContext.substring(0, 100) + '...');

    // SINGLE API CALL with RAG (no parallel calls!)
    const prompt = generateEnhancedRAGPrompt(country, graduationYear, wikiContext, language);
    console.log('Making single Lovable AI call with RAG...');
    
    const response = await fetchWithTimeout(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: 'You are an educational historian specializing in debunked school facts. Generate accurate, well-researched content based on Wikipedia sources and documented misconceptions.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2, // LOW temperature for accuracy
          max_tokens: 3000,
        })
      },
      25000
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`Lovable AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;
    
    if (!rawContent) {
      throw new Error('No content generated');
    }

    console.log('Generated content (first 200 chars):', rawContent.substring(0, 200) + '...');
    
    // Parse the response
    const parsed = parseFactResponse(rawContent, graduationYear);
    let finalFacts = parsed.facts;
    const educationProblems = parsed.educationProblems;
    
    console.log('Parsed:', finalFacts.length, 'facts,', educationProblems.length, 'problems');

    // Validate and filter facts
    finalFacts = finalFacts.filter((fact: any) => 
      fact && 
      typeof fact.fact === 'string' && 
      fact.fact.trim().length > 20 &&
      fact.yearDebunked && 
      fact.yearDebunked > graduationYear &&
      fact.correction &&
      fact.correction.length > 10
    );

    console.log('After validation:', finalFacts.length, 'valid facts');

    // Fallback if not enough facts
    if (finalFacts.length < 5) {
      console.log('Not enough facts, adding fallbacks...');
      const fallbackFacts = generateFallbackFacts(country, graduationYear);
      finalFacts.push(...fallbackFacts);
    }

    // Take top 8
    finalFacts = finalFacts.slice(0, 8);

    if (finalFacts.length === 0) {
      throw new Error('No facts could be generated');
    }

    console.log(`Final result: ${finalFacts.length} facts`);

    // Cache the results
    try {
      await supabase.from('cached_facts').insert({
        country,
        graduation_year: graduationYear,
        facts_data: finalFacts,
        education_system_problems: educationProblems
      });
      console.log('Cached successfully');
    } catch (cacheError) {
      console.error('Cache error (non-critical):', cacheError);
    }

    return new Response(JSON.stringify({
      facts: finalFacts,
      educationProblems: educationProblems,
      cached: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in generate-facts:', error);
    
    // Emergency fallback
    try {
      const { country, graduationYear } = await req.json();
      const emergencyFacts = generateFallbackFacts(country, graduationYear);
      
      return new Response(JSON.stringify({
        facts: emergencyFacts,
        educationProblems: [],
        cached: false,
        fallback: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch {
      return new Response(JSON.stringify({ 
        error: 'Service temporarily unavailable'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
});

// Enhanced RAG-based prompt with Wikipedia context
function generateEnhancedRAGPrompt(country: string, year: number, wikiContext: string, language: string): string {
  const currentYear = new Date().getFullYear();
  const languageInstruction = language === 'de' 
    ? 'Generate ALL content in German language. Respond in German.' 
    : 'Generate ALL content in English language.';
  
  return `${languageInstruction}

Based on Wikipedia context and documented misconceptions, generate 8 educational facts that students in ${country} learned around ${year} which are now completely debunked.

**Wikipedia Research Context:**
${wikiContext}

**CRITICAL: Use ONLY documented real misconceptions from Wikipedia's "List of common misconceptions", adapted to school context in ${country} around ${year}.**

DOCUMENTED MISCONCEPTIONS TO ADAPT:
- Biology: "Bats are blind" (false: excellent vision), "Bulls enraged by red" (colorblind), "Goldfish 3-second memory" (months-long), "Camel humps store water" (fat), "Humans use only 10% of brain" (use all parts)
- Physics: "Seasons from Earth-sun distance" (axial tilt), "Great Wall visible from space" (not with naked eye), "Pennies from Empire State kills" (terminal velocity too low), "Lightning never strikes twice" (it does)
- Medicine: "Tongue taste zones" (taste buds everywhere), "8 glasses water daily" (no scientific basis), "Sugar causes hyperactivity" (placebo effect), "Stomach ulcers from stress" (H. pylori bacteria)
- History: "Vikings horned helmets" (no evidence), "Medieval flat Earth belief" (educated knew round), "Napoleon was short" (average height), "Columbus proved Earth round" (already known)
- Geography: "Great Wall only man-made structure from space" (false), "Sahara always a desert" (was green), "Mount Everest tallest from base" (Mauna Kea is)
- Space: "Weightless because no gravity" (free fall), "Dark side of Moon never lit" (gets sunlight), "Can see Great Wall from Moon" (impossible)

Generate EXACTLY in this JSON format (NO markdown, NO code blocks):

{
  "facts": [
    {
      "category": "[Science/Medicine/Technology/Geography/History]",
      "fact": "In ${year}, students in ${country} were authoritatively taught that [documented misconception adapted as school curriculum from that era]",
      "correction": "[The documented correct scientific information that proves this completely wrong]", 
      "yearDebunked": [realistic year between ${year + 5} and ${currentYear}],
      "mindBlowingFactor": "[How this real misconception fooled entire generations of students]",
      "sourceName": "[Educational source - textbook, curriculum, teaching material]"
    }
  ],
  "educationProblems": [
    {
      "problem": "[Systemic educational issue that allowed these misconceptions]",
      "description": "[How textbooks and teachers spread these documented wrong facts]",
      "impact": "[How many students were taught these false facts]"
    }
  ]
}

ABSOLUTE REQUIREMENTS:
- Use ONLY verified misconceptions from Wikipedia's documented list
- Every yearDebunked MUST be realistic: ${year + 5} to ${currentYear}
- Make facts sound like authoritative school knowledge taught with confidence
- Show dramatic contrast with documented correct information
- Generate EXACTLY 8 facts (no more, no less)
- ${languageInstruction}
- Focus on misconceptions that were ACTUALLY taught in schools as facts
- Be specific about ${country}'s educational context in ${year}`;
}

// Parse AI response
function parseFactResponse(rawContent: string, graduationYear: number) {
  try {
    let cleanContent = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    const jsonStart = cleanContent.indexOf('{');
    const jsonEnd = cleanContent.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1) {
      return { facts: [], educationProblems: [] };
    }
    
    const jsonString = cleanContent.substring(jsonStart, jsonEnd + 1);
    const parsedResponse = JSON.parse(jsonString);
    
    return {
      facts: parsedResponse.facts || [],
      educationProblems: parsedResponse.educationProblems || []
    };
  } catch (error) {
    console.error('Parse error:', error);
    return { facts: [], educationProblems: [] };
  }
}

// Fallback facts based on documented Wikipedia misconceptions
function generateFallbackFacts(country: string, graduationYear: number) {
  const currentYear = new Date().getFullYear();
  const baseDebunkYear = Math.min(graduationYear + Math.floor(Math.random() * 10) + 5, currentYear);
  
  const misconceptions = [
    {
      category: "Biology",
      fact: `In ${graduationYear}, biology students in ${country} were authoritatively taught that bats are completely blind and navigate only through echolocation - this was presented as absolute scientific fact in every textbook.`,
      correction: "All bat species actually have eyes and can see. Many bats have excellent night vision, and only some species primarily use echolocation for navigation.",
      yearDebunked: baseDebunkYear,
      mindBlowingFactor: "Students spent years believing mammals could be completely blind when bats actually have better night vision than most animals!",
      sourceName: "Standard biology textbooks"
    },
    {
      category: "Physics",
      fact: `In ${graduationYear}, science students in ${country} learned that Earth's seasons are caused by the planet being closer to the Sun in summer and farther away in winter - teachers presented this as basic astronomy.`,
      correction: "Seasons are actually caused by Earth's 23.4-degree axial tilt. Earth is actually closest to the Sun in January (Northern Hemisphere winter) and farthest in July.",
      yearDebunked: baseDebunkYear + 1,
      mindBlowingFactor: "Schools taught the exact opposite of reality - summer happens when we're farther from the Sun, not closer!",
      sourceName: "Physics and Earth science textbooks"
    },
    {
      category: "Science",
      fact: `In ${graduationYear}, students in ${country} confidently learned that the tongue had specific taste zones - sweet at the tip, sour on the sides, bitter at the back - and memorized these zones for biology tests.`,
      correction: "Taste buds for all flavors are actually distributed across the entire tongue. The 'tongue map' was based on a mistranslation of a German study from 1901.",
      yearDebunked: baseDebunkYear + 2,
      mindBlowingFactor: "Generations of students drew completely wrong tongue diagrams because of a translation error from over 100 years ago!",
      sourceName: "Biology and health textbooks"
    },
    {
      category: "Geography", 
      fact: `In ${graduationYear}, geography classes in ${country} proudly taught that the Great Wall of China is the only human-made structure visible from space with the naked eye - this was a standard 'amazing fact' in textbooks.`,
      correction: "The Great Wall is NOT visible from space with the naked eye. No Apollo astronauts reported seeing any specific human structures from the Moon, and even from low Earth orbit it requires magnification.",
      yearDebunked: baseDebunkYear + 3,
      mindBlowingFactor: "One of the most repeated 'facts' in schools was completely false - astronauts couldn't see it even when they tried!",
      sourceName: "Geography and social studies textbooks"
    },
    {
      category: "Medicine",
      fact: `In ${graduationYear}, health classes in ${country} definitively taught that stomach ulcers are caused by stress, spicy food, and acid - doctors prescribed bland diets and stress management as the cure.`,
      correction: "Most stomach ulcers are actually caused by H. pylori bacteria and can be cured with antibiotics in about a week. The bacterial cause was proven in the 1980s.",
      yearDebunked: Math.min(baseDebunkYear + 4, 1990),
      mindBlowingFactor: "Medical textbooks were prescribing lifestyle changes for what turned out to be a simple bacterial infection - the discoverers even won a Nobel Prize!",
      sourceName: "Health education and medical textbooks"
    },
    {
      category: "History",
      fact: `In ${graduationYear}, history students in ${country} learned that medieval people believed the Earth was flat until Columbus proved it was round by sailing to America.`,
      correction: "Educated people knew the Earth was spherical since ancient Greek times. Medieval scholars, navigators, and even common people understood Earth's roundness - the flat Earth myth was largely invented in the 1800s.",
      yearDebunked: baseDebunkYear + 5,
      mindBlowingFactor: "Schools taught a completely fabricated story about medieval ignorance - they actually had better geographical knowledge than we gave them credit for!",
      sourceName: "History and social studies curriculum"
    },
    {
      category: "Zoology",
      fact: `In ${graduationYear}, students in ${country} learned that bulls become enraged when they see the color red, which is why bullfighters use red capes - this was taught as animal behavior fact.`,
      correction: "Bulls are actually red-green colorblind (dichromats), so red doesn't stand out to them. They charge at the movement of the cape, not its color.",
      yearDebunked: baseDebunkYear + 6,
      mindBlowingFactor: "The most famous example of animal color-rage was taught in schools when bulls literally cannot even see the color red properly!",
      sourceName: "Animal behavior and biology textbooks"
    },
    {
      category: "Space Science",
      fact: `In ${graduationYear}, astronomy students in ${country} were taught that astronauts float in space because there's no gravity up there - this was the standard explanation for weightlessness.`,
      correction: "Astronauts are weightless because they're in continuous free fall around Earth. Gravity at the International Space Station altitude is about 90% as strong as on Earth's surface.",
      yearDebunked: baseDebunkYear + 7,
      mindBlowingFactor: "Schools taught that gravity stops working in space, when astronauts are actually falling around Earth so fast they keep missing it!",
      sourceName: "Physics and space science textbooks"
    }
  ];
  
  const shuffled = misconceptions.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 6);
}
