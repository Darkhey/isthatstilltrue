
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
  
  return `You are a historical education researcher. Research the ACTUAL educational curricula, textbooks, and teaching standards used in ${country} around ${year}.

CRITICAL RESEARCH REQUIREMENTS:
1. Find REAL, SPECIFIC educational sources from that time period
2. Identify actual textbooks, curriculum guides, educational laws that existed
3. Research what was ACTUALLY taught in schools, not general historical knowledge
4. Look for concrete examples of educational content from that era

Please provide detailed research on:

**SPECIFIC TEXTBOOKS & MATERIALS:**
- What science textbooks were used in ${country} schools around ${year}?
- Which history books were standard curriculum?
- What medical/health education materials were taught?
- Which geography and social studies resources were used?

**CURRICULUM STANDARDS:**
- What were the official educational standards for different subjects?
- Which scientific theories were part of mandatory curriculum?
- What political/social concepts were required teaching?
- Which historical interpretations were standard in textbooks?

**EDUCATIONAL POLICIES:**
- What educational laws or reforms were in place around ${year}?
- Which subjects were emphasized or de-emphasized?
- What were the official teaching guidelines?

**CONCRETE EXAMPLES:**
Find specific examples of what students in ${country} around ${year} would have learned that:
- Has since been scientifically disproven or updated
- Reflected the political/social views of that time but changed since
- Was considered medical/health fact then but revised now
- Represented the geographical/historical understanding of that era

Focus on AUTHENTIC educational content, not general historical assumptions. Provide specific source names, textbook titles, curriculum names wherever possible.

Research thoroughly and provide concrete, verifiable educational sources from ${country} circa ${year}.`;
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
