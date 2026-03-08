

## Analysis: Current Problems

After reviewing the codebase, I found several critical issues with the school mode flow:

### 1. Response Format Mismatch (Bug)
The `research-school-memories` edge function returns the AI response directly as `{ whatHappenedAtSchool, nostalgiaFactors, ... }`, but the frontend (`FactsDebunker.tsx` line 491) checks for `data.schoolMemories` -- which doesn't exist. This means **school mode never works** and always shows "No school memories found."

### 2. No Real School Search
The SchoolPicker is just free-text input fields. There's no verification that the school actually exists. Users can type anything.

### 3. Fake "Research" Pipeline
The `performSchoolSpecificWebSearch` function doesn't actually search the web -- it asks the AI to *generate plausible sources*, which are fabricated. The Google Search and GNews APIs require keys (`GOOGLE_API_KEY`, `GOOGLE_SEARCH_ENGINE_ID`, `GNEWS_API_KEY`) that aren't configured, so those always return empty arrays.

### 4. Country Value Mismatch
SchoolPicker uses lowercase values (`"germany"`) while FactsDebunker uses capitalized (`"Germany"`), causing inconsistencies when data is sent to the backend.

---

## Plan

### Task 1: Fix the response format in `research-school-memories`
Wrap the AI response so the edge function returns `{ schoolMemories: memories, shareableContent: {...}, historicalHeadlines: [...] }` -- matching what the frontend expects.

### Task 2: Add real school lookup with Wikipedia API
Replace the free-text school name input with an autocomplete search that queries the Wikipedia API to verify the school exists. This gives us:
- Real school names with Wikipedia article confirmation
- A verified school URL/source to feed into the research pipeline
- Evidence that the school is real

Implementation: Add a debounced search input in `SchoolPicker` that calls `https://en.wikipedia.org/w/api.php?action=opensearch&search=<schoolName>+school+<city>` and shows matching results as suggestions.

### Task 3: Replace fake web search with real Wikipedia-based research
Rewrite the `research-school-memories` edge function to:
- Use Wikipedia API to fetch the actual school's article (if it exists)
- Use Wikipedia API to fetch real historical events for that city and year
- Use Wikipedia's "On this day" / year-specific articles for verified local context
- Only pass **real, fetched content** to the AI -- no asking AI to invent sources

### Task 4: Fix country value consistency
Align SchoolPicker's country values with FactsDebunker's (use capitalized full names like `"Germany"` everywhere).

### Task 5: Improve evidence display
Update `SchoolMemoryCard` to show source URLs from the research, making it clear which information is verified vs. general nostalgia content.

---

### Technical Details

**Wikipedia APIs to use (all free, no API key needed):**
- `opensearch` -- school name autocomplete
- `query&list=search` -- find articles about the school
- `query&titles=<title>&prop=extracts` -- get article content for RAG
- Search for `"<City> in <Year>"` articles for local context

**Edge function response restructure:**
```
// Current (broken): returns raw AI JSON
return Response(JSON.stringify(memories))

// Fixed: wrap to match frontend expectations  
return Response(JSON.stringify({
  schoolMemories: memories,
  shareableContent: { mainShare, whatsappShare, ... },
  historicalHeadlines: memories.localContext
}))
```

**School autocomplete flow:**
User types school name -> debounced Wikipedia opensearch -> show dropdown suggestions -> user picks verified school -> school Wikipedia URL stored for research phase.

