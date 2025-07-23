
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const { country, graduationYear } = await req.json();
    
    if (!country || !graduationYear) {
      return new Response(
        JSON.stringify({ error: 'Country and graduation year are required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Check if we have cached facts
    const { data: cachedData } = await supabase
      .from('cached_facts')
      .select('*')
      .eq('country', country)
      .eq('graduation_year', graduationYear)
      .maybeSingle();

    if (cachedData) {
      const cacheAge = Math.floor((new Date().getTime() - new Date(cachedData.created_at).getTime()) / (1000 * 60 * 60 * 24));
      console.log(`Found cached facts for ${country} ${graduationYear}, age: ${cacheAge} days`);
      
      return new Response(JSON.stringify({
        facts: cachedData.facts_data,
        educationProblems: cachedData.education_system_problems || [],
        cached: true,
        cacheAge
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    console.log(`Generating new facts for ${country} ${graduationYear}`);

    let curriculumContent = '';
    let educationProblems: any[] = [];

    try {
      // Phase 1: Streamlined curriculum research with timeout
      console.log('Phase 1: Quick curriculum research...');
      const curriculumPrompt = await generateStreamlinedCurriculumPrompt(country, graduationYear);
      
      const curriculumResponse = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: curriculumPrompt }] }],
            generationConfig: {
              temperature: 0.5,
              topK: 30,
              topP: 0.8,
              maxOutputTokens: 2048,
            }
          })
        },
        20000 // 20 second timeout
      );

      if (curriculumResponse.ok) {
        const curriculumData = await curriculumResponse.json();
        curriculumContent = curriculumData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log('Phase 1 completed successfully');
      } else {
        console.warn('Curriculum research failed, using fallback');
        curriculumContent = `Educational trends for ${country} around ${graduationYear}`;
      }
    } catch (error) {
      console.warn('Curriculum research timeout, using fallback:', error);
      curriculumContent = `Educational trends for ${country} around ${graduationYear}`;
    }

    // Phase 2: Generate facts with multiple parallel requests and timeouts
    console.log('Phase 2: Generating facts with parallel requests...');
    
    const factPromises = [];
    for (let i = 0; i < 3; i++) {
      const factPrompt = await generateOptimizedFactPrompt(country, graduationYear, curriculumContent, i);
      
      const promise = fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: factPrompt }] }],
            generationConfig: {
              temperature: 0.7 + (i * 0.1),
              topK: 40,
              topP: 0.9,
              maxOutputTokens: 3072,
            }
          })
        },
        20000 // 20 second timeout
      ).then(async (response) => {
        if (!response.ok) return { facts: [], educationProblems: [] };
        
        const data = await response.json();
        const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        return parseFactResponse(rawContent, graduationYear);
      }).catch((error) => {
        console.error(`Parallel request ${i + 1} failed:`, error);
        return { facts: [], educationProblems: [] };
      });
      
      factPromises.push(promise);
    }

    // Wait for all parallel requests
    const results = await Promise.allSettled(factPromises);
    
    // Collect all valid facts
    let allValidFacts: any[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const validFacts = result.value.facts.filter((fact: any) => 
          fact && 
          typeof fact.fact === 'string' && 
          fact.fact.trim().length > 15 &&
          fact.yearDebunked && 
          fact.yearDebunked > graduationYear
        );
        allValidFacts.push(...validFacts);
        
        // Store education problems from first successful result
        if (index === 0 && result.value.educationProblems?.length > 0) {
          educationProblems = result.value.educationProblems;
        }
        
        console.log(`Parallel request ${index + 1}: Generated ${validFacts.length} valid facts`);
      }
    });

    // Remove duplicates
    const uniqueFacts = allValidFacts.filter((fact, index, self) => 
      index === self.findIndex(f => 
        f.fact.toLowerCase().trim() === fact.fact.toLowerCase().trim()
      )
    );

    let finalFacts = uniqueFacts.slice(0, 8);

    // Fallback if we don't have enough facts
    if (finalFacts.length < 4) {
      console.log('Adding fallback facts...');
      const fallbackFacts = generateFallbackFacts(country, graduationYear);
      finalFacts.push(...fallbackFacts);
      finalFacts = finalFacts.slice(0, 8);
    }

    if (finalFacts.length === 0) {
      throw new Error('No facts could be generated');
    }

    console.log(`Generated ${finalFacts.length} final facts`);

    // Cache the results
    try {
      await supabase.from('cached_facts').insert({
        country,
        graduation_year: graduationYear,
        facts_data: finalFacts,
        education_system_problems: educationProblems
      });
      console.log('Facts cached successfully');
    } catch (cacheError) {
      console.error('Error caching facts:', cacheError);
    }

    return new Response(JSON.stringify({
      facts: finalFacts,
      educationProblems: educationProblems,
      cached: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in generate-facts function:', error);
    
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

// Helper function to parse fact response
function parseFactResponse(rawContent: string, graduationYear: number) {
  try {
    // Clean up the response by removing markdown code blocks
    let cleanContent = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    cleanContent = cleanContent.trim();
    
    // Find the JSON object in the response
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
    console.error('Failed to parse fact response:', error);
    return { facts: [], educationProblems: [] };
  }
}

// Generate fallback facts when AI fails - using documented Wikipedia misconceptions
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
  
  // Return 6 random misconceptions
  const shuffled = misconceptions.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 6);
}

// Streamlined curriculum research prompt
async function generateStreamlinedCurriculumPrompt(country: string, year: number): Promise<string> {
  return `Research key educational content and trends in ${country} around ${year}. Focus on:

1. **Major Curriculum Changes**: What subjects and topics were being taught?
2. **Popular Textbooks**: What educational materials were widely used?
3. **Teaching Methods**: How were students being educated?
4. **Scientific/Medical Understanding**: What was the accepted knowledge in schools?
5. **Technology Integration**: How was technology being taught or used?

Provide specific, factual information about what students were learning that might have been updated, corrected, or improved upon in later years.

Focus on authentic educational content from that era, not speculation. Keep response concise but informative.`;
}

// Optimized fact generation prompt
async function generateOptimizedFactPrompt(country: string, year: number, curriculumContent: string, variation: number): Promise<string> {
  const currentYear = new Date().getFullYear();
  const focusAreas = [
    'Science and Medicine - Use documented misconceptions like "bats are blind", "tongue taste zones", "humans use 10% of brain"',
    'Technology and Geography - Use misconceptions like "Great Wall visible from space", "seasons from Earth-sun distance"'
  ];
  
  return `Based on documented misconceptions from Wikipedia's List of Common Misconceptions, generate school facts that students in ${country} learned around ${year} which are now completely debunked.

**Research Context**: ${curriculumContent}

**Focus**: ${focusAreas[variation] || 'General Education using documented misconceptions'}

**Use these proven misconceptions as inspiration and adapt them to the era/topic:**

DOCUMENTED MISCONCEPTIONS TO ADAPT:
- Biology: "Bats are blind" (they have excellent vision), "Bulls enraged by red" (they're colorblind), "Camel humps store water" (actually fat), "Dogs age 7x human rate" (varies by breed)
- Physics: "Seasons caused by Earth-sun distance" (actually axial tilt), "Great Wall visible from space" (not visible to naked eye), "Lightning never strikes twice" (frequently does)
- History: "Pyramids built by slaves" (paid workers), "Vikings wore horned helmets" (no evidence), "Medieval flat Earth belief" (educated knew it was round)
- Medicine: "Different tongue regions taste differently" (taste buds distributed everywhere), "You need 8 glasses water daily" (no scientific basis)
- Space: "Astronauts weightless due to no gravity" (actually in free fall), "Dark side of Moon never lit" (gets same sunlight)

Generate 6-8 facts in this EXACT JSON format (no markdown, no code blocks):

{
  "facts": [
    {
      "category": "[Science/Medicine/Technology/Geography/History]",
      "fact": "In ${year}, students in ${country} were authoritatively taught that [adapt a documented misconception to sound like school curriculum from that era]",
      "correction": "[The documented correct information that proves the school fact completely wrong]", 
      "yearDebunked": [MUST be > ${year} and <= ${currentYear}],
      "mindBlowingFactor": "[Emphasize how this real misconception fooled entire generations of students]",
      "sourceName": "[Educational source - textbook, curriculum, etc.]"
    }
  ],
  "educationProblems": [
    {
      "problem": "[Educational system issue that led to these misconceptions being taught]",
      "description": "[How textbooks/teachers spread these wrong facts]",
      "impact": "[How many students believed these false facts]"
    }
  ]
}

CRITICAL REQUIREMENTS:
- ONLY use documented real misconceptions from the Wikipedia list, adapted to the school context
- Every yearDebunked must be > ${year} and <= ${currentYear}
- Make facts sound like authoritative school knowledge that was confidently taught
- Show the dramatic contrast with documented correct information
- Focus on misconceptions that were actually taught in schools as facts
- Generate MORE facts (6-8) to increase success rate
- Emphasize how embarrassing it is that schools taught these wrong facts as truth`;
}

async function generateCurriculumResearchPrompt(country: string, year: number): Promise<string> {
  const factType = getFactGenerationType(year);
  
  return `You are an expert educational researcher with comprehensive online access. Conduct an INTENSIVE, THOROUGH online search to find ACTUAL curriculum documents, textbooks, and educational materials used in ${country} around ${year}.

🔍 **INTENSIVE SEARCH PROTOCOL - SPEND SIGNIFICANT TIME RESEARCHING:**

**1. GOVERNMENT & OFFICIAL SOURCES (Search Extensively):**
   - Ministry of Education websites for ${country}
   - National archive sites (.gov, .edu domains)
   - Official curriculum frameworks from ${year-3} to ${year+2}
   - Educational policy documents and white papers
   - Teacher certification requirements from that era
   - School inspection reports and standards

**2. INSTITUTIONAL DATABASES (Deep Search):**
   - University education department archives
   - Teacher training college repositories
   - State/provincial education board materials
   - National library education collections
   - International education databases (UNESCO, OECD)

**3. TEXTBOOK & PUBLISHER RESEARCH (Comprehensive):**
   - Major education publisher websites and catalogs
   - ISBN databases for books published ${year-5} to ${year+2}
   - School adoption lists and approved textbook lists
   - Publisher annual reports mentioning popular titles
   - Academic book reviews from education journals

**4. PRIMARY EDUCATIONAL SOURCES (Detailed Investigation):**
   - Teacher training manuals and guides
   - Curriculum development conference proceedings
   - Educational research papers and dissertations
   - School board meeting minutes and decisions
   - Contemporary education journal articles

**5. HISTORICAL EDUCATION ANALYSIS:**
   - Comparative education studies focusing on ${country}
   - Historical analysis of ${country}'s education system
   - International education policy comparisons
   - Educational reform documentation

**SPECIFIC SEARCH TARGETS FOR ${country} ${year}:**

📚 **EXACT TEXTBOOKS & MATERIALS:**
   - Search for specific textbook titles used in science classes
   - Find biology, chemistry, physics books from major publishers
   - Locate history textbooks with specific ISBN numbers
   - Identify health education and sex education materials
   - Find geography atlases and social studies resources
   - Search for mathematics textbooks and their content

📋 **DETAILED CURRICULUM STANDARDS:**
   - Official learning objectives for each grade level
   - Mandatory vs optional curriculum components
   - Assessment standards and testing requirements
   - Subject-specific teaching guidelines
   - Cross-curricular themes and approaches

🏛️ **EDUCATIONAL POLICIES & REFORMS:**
   - Specific education laws enacted around ${year}
   - Funding formulas and resource allocation
   - Teacher training and qualification requirements
   - Special education policies and inclusion practices
   - Language instruction policies

**CRITICAL CONTENT TO IDENTIFY:**
Find specific examples of what was taught as FACT in ${country} schools around ${year} that has since been:
   ✓ Scientifically disproven or significantly updated
   ✓ Medically revised or replaced with new understanding
   ✓ Historically reinterpreted or corrected
   ✓ Technologically superseded or proven wrong
   ✓ Geographically corrected (maps, boundaries, data)
   ✓ Socially or politically reconsidered

**RESEARCH DEPTH REQUIREMENTS:**
- Spend extensive time searching each category
- Cross-reference multiple sources for accuracy
- Look for specific page numbers, chapter titles, lesson plans
- Find exact quotes from educational materials when possible
- Verify information through multiple independent sources
- Focus on widely-adopted, mainstream educational content

**OUTPUT REQUIREMENTS:**
Provide extremely detailed findings including:
- Specific textbook titles, authors, publishers, ISBN numbers
- Exact curriculum document names and sections
- Direct quotes from educational materials
- Specific topics, theories, and facts taught as established truth
- Names of educational officials, policies, and reform initiatives
- Detailed description of teaching methods and approaches

Take your time with this research - accuracy and specificity are critical. The more detailed and authentic your findings, the better the educational fact generation will be.

RESEARCH INTENSIVELY - This is the foundation for accurate fact generation.`;
}

async function generateFactPrompt(country: string, year: number, curriculumResearch: string): Promise<string> {
  const factType = getFactGenerationType(year);
  const currentYear = new Date().getFullYear();
  
  let promptIntro = '';
  let factContext = '';
  
  if (factType === 'modern') {
    promptIntro = `Based on your curriculum research, generate educational facts that students in ${country} would have learned in ${year} that have since been debunked or updated.`;
    factContext = `Students in ${country} graduating in ${year} were taught`;
  } else if (factType === 'historical') {
    promptIntro = `Based on your curriculum research, generate educational content that was taught in ${country} around ${year} that we now understand differently.`;
    factContext = `In ${year}, educated people in ${country} commonly learned`;
  } else {
    promptIntro = `Based on your curriculum research, generate worldviews and knowledge that were taught or commonly believed in ${country} around ${year}.`;
    factContext = `In ${year}, people in ${country} believed`;
  }

  return `${promptIntro}

**CURRICULUM RESEARCH BASIS:**
${curriculumResearch}

**CRITICAL REQUIREMENTS:**
- Base ALL facts STRICTLY on the curriculum research above
- Each fact MUST be traceable to specific educational sources mentioned in the research
- yearDebunked MUST be AFTER ${year} (minimum ${year + 1}, maximum ${currentYear})
- Do NOT invent facts - only use what the curriculum research reveals
- Focus on what was ACTUALLY taught in schools, not general historical knowledge

RETURN ONLY PURE JSON - NO MARKDOWN, NO EXPLANATIONS, NO CODE BLOCKS.

Generate 8-10 educational facts in this exact JSON format:

{
  "facts": [
    {
      "category": "[Science/Medicine/Technology/Politics/History/Geography/etc]",
      "fact": "In ${year}, students in ${country} were taught that [specific educational content from curriculum research]",
      "correction": "[What we know now - modern understanding]",
      "yearDebunked": [MUST be > ${year} and <= ${currentYear}],
      "mindBlowingFactor": "[Why this change in understanding matters]",
      "sourceUrl": "[If available from research]",
      "sourceName": "[Specific textbook/curriculum name from research]"
    }
  ],
  "educationProblems": [
    {
      "problem": "[Educational system issue from that era]",
      "description": "[How it affected learning]", 
      "impact": "[Long-term consequences]"
    }
  ]
}

**VALIDATION RULES:**
- Every yearDebunked > ${year}
- Every fact must reference the curriculum research
- Focus on authentic educational content, not speculation
- Include specific source names from the research when possible

Generate only facts that are directly supported by the curriculum research provided above.`;
}

function getFactGenerationType(year: number): 'modern' | 'historical' | 'ancient' {
  if (year >= 1900) return 'modern';
  if (year >= 1800) return 'historical';
  return 'ancient';
}
