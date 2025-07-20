
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      .single();

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

    // Phase 1: Research actual curricula and educational content
    const curriculumPrompt = await generateCurriculumResearchPrompt(country, graduationYear);
    console.log('Phase 1: Researching curricula...');
    
    const curriculumResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: curriculumPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.8,
          maxOutputTokens: 8192,
        }
      })
    });

    if (!curriculumResponse.ok) {
      throw new Error(`Curriculum research failed: ${curriculumResponse.status}`);
    }

    const curriculumData = await curriculumResponse.json();
    const curriculumContent = curriculumData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!curriculumContent) {
      throw new Error('No curriculum research content received');
    }

    console.log('Phase 1 completed. Curriculum research:', curriculumContent.substring(0, 200) + '...');

    // Phase 2: Generate facts based on researched curricula
    const factPrompt = await generateFactPrompt(country, graduationYear, curriculumContent);
    console.log('Phase 2: Generating facts based on curricula...');

    let attempts = 0;
    let validFacts = [];
    const maxAttempts = 3;

    while (attempts < maxAttempts && validFacts.length < 6) {
      attempts++;
      console.log(`Fact generation attempt ${attempts}/${maxAttempts}`);

      const factResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: factPrompt }] }],
          generationConfig: {
            temperature: 0.8,
            topK: 40,
            topP: 0.9,
            maxOutputTokens: 8192,
          }
        })
      });

      if (!factResponse.ok) {
        console.error(`Fact generation attempt ${attempts} failed: ${factResponse.status}`);
        continue;
      }

      const factData = await factResponse.json();
      const factContent = factData.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!factContent) {
        console.error(`No fact content received in attempt ${attempts}`);
        continue;
      }

      try {
        // Clean up the response by removing markdown code blocks
        let cleanContent = factContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        cleanContent = cleanContent.trim();
        
        // Find the JSON object in the response
        const jsonStart = cleanContent.indexOf('{');
        const jsonEnd = cleanContent.lastIndexOf('}');
        
        if (jsonStart === -1 || jsonEnd === -1) {
          throw new Error('No valid JSON object found in response');
        }
        
        const jsonString = cleanContent.substring(jsonStart, jsonEnd + 1);
        console.log('Raw content:', factContent.substring(0, 200) + '...');
        console.log('Cleaned JSON string preview:', jsonString.substring(0, 200) + '...');

        const parsedResponse = JSON.parse(jsonString);
        const allFacts = parsedResponse.facts || [];
        
        // Validate facts: yearDebunked must be > graduationYear
        const newValidFacts = allFacts.filter(fact => {
          const isValid = fact.yearDebunked && fact.yearDebunked > graduationYear;
          if (!isValid) {
            console.log(`Rejected fact: yearDebunked ${fact.yearDebunked} <= graduationYear ${graduationYear}`);
          }
          return isValid;
        });

        validFacts = [...validFacts, ...newValidFacts];
        console.log(`Attempt ${attempts}: Generated ${allFacts.length} facts, ${newValidFacts.length} valid, total valid: ${validFacts.length}`);

        // Store education problems from first successful attempt
        if (attempts === 1 && parsedResponse.educationProblems) {
          var educationProblems = parsedResponse.educationProblems;
        }

      } catch (parseError) {
        console.error(`Failed to parse JSON in attempt ${attempts}:`, parseError);
        console.log('Raw content:', factContent.substring(0, 500));
      }
    }

    if (validFacts.length === 0) {
      throw new Error('Failed to generate valid facts after multiple attempts');
    }

    // Take the first 8 valid facts
    const finalFacts = validFacts.slice(0, 8);
    
    console.log(`Successfully generated ${finalFacts.length} valid facts`);

    // Cache the results
    await supabase.from('cached_facts').insert({
      country,
      graduation_year: graduationYear,
      facts_data: finalFacts,
      education_system_problems: educationProblems || []
    });

    return new Response(JSON.stringify({
      facts: finalFacts,
      educationProblems: educationProblems || [],
      cached: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in generate-facts function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

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
