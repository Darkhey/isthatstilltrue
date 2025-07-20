
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
    for (let i = 0; i < 2; i++) {
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

// Generate fallback facts when AI fails
function generateFallbackFacts(country: string, graduationYear: number) {
  const currentYear = new Date().getFullYear();
  const debunkYear = Math.min(graduationYear + Math.floor(Math.random() * 10) + 1, currentYear);
  
  return [
    {
      category: "Science",
      fact: `In ${graduationYear}, students in ${country} were taught that certain scientific theories were absolute facts, before newer research provided different perspectives.`,
      correction: "Scientific understanding continuously evolves with new research and technology.",
      yearDebunked: debunkYear,
      mindBlowingFactor: "This shows how scientific knowledge is always advancing.",
      sourceName: "General curriculum standards"
    },
    {
      category: "Technology", 
      fact: `In ${graduationYear}, students in ${country} learned about technology that was considered cutting-edge at the time.`,
      correction: "Technology has advanced significantly since then with new innovations.",
      yearDebunked: Math.min(graduationYear + 5, currentYear),
      mindBlowingFactor: "Technology evolves at an incredible pace.",
      sourceName: "Educational technology curriculum"
    },
    {
      category: "Medicine",
      fact: `In ${graduationYear}, health education in ${country} taught certain medical practices that were standard at the time.`,
      correction: "Medical knowledge and best practices have improved with new research.",
      yearDebunked: Math.min(graduationYear + 8, currentYear),
      mindBlowingFactor: "Medical science constantly improves patient care.",
      sourceName: "Health education standards"
    },
    {
      category: "Geography",
      fact: `In ${graduationYear}, geography classes in ${country} used maps and data that reflected the world understanding of that time.`,
      correction: "Geographic data and mapping technology have become much more accurate.",
      yearDebunked: Math.min(graduationYear + 3, currentYear),
      mindBlowingFactor: "Our understanding of the world keeps getting more precise.",
      sourceName: "Geography curriculum"
    }
  ];
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
    'Science and Medicine',
    'Technology and Geography'
  ];
  
  return `Based on educational research for ${country} around ${year}, generate facts about what students learned that has since been updated or corrected.

**Research Context**: ${curriculumContent}

**Focus**: ${focusAreas[variation] || 'General Education'}

Generate 4-6 facts in this EXACT JSON format (no markdown, no code blocks):

{
  "facts": [
    {
      "category": "[Science/Medicine/Technology/Geography/History]",
      "fact": "In ${year}, students in ${country} were taught that [specific educational content]",
      "correction": "[What we know now]", 
      "yearDebunked": [MUST be > ${year} and <= ${currentYear}],
      "mindBlowingFactor": "[Why this matters]",
      "sourceName": "[Educational source]"
    }
  ],
  "educationProblems": [
    {
      "problem": "[Educational issue from that era]",
      "description": "[How it affected learning]",
      "impact": "[Consequences]"
    }
  ]
}

Requirements:
- Every yearDebunked must be > ${year}
- Focus on authentic educational content
- Make facts specific and interesting
- Avoid speculation, use realistic scenarios`;
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
