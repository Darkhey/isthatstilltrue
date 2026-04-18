

## Goal
Make generated facts dramatically more **specific, varied, and mind-blowing** — and improve a few high-impact UX touches. No backend schema change required.

## What's wrong today (root cause)

Looking at `enhanced-fact-generator/index.ts`:

1. **Repetitive sentence template**: The prompt instructs `"In ${year}, students in ${country} were authoritatively taught..."` for every fact → every result reads identical.
2. **Tiny pool of misconceptions**: The prompt lists ~15 famous ones (bats, taste map, Great Wall, ulcers, seasons, Vikings…) and the AI just shuffles them → not specific to year or country.
3. **Temperature 0.1**: Optimised for accuracy but kills variety and punch.
4. **No subject diversity requirement**: 8 facts often cluster in Biology/Physics; nothing forces Math, Language, Art, Tech, Sport, Food, Sex-ed.
5. **`mindBlowingFactor` is a separate field**: AI treats it as filler ("Generations of students believed…") instead of weaving the wow into the fact itself.
6. **Cache is permanent per (country, year)**: a boring set generated once is served forever. No way to regenerate.

## Plan

### 1. Rewrite the prompt (biggest win)

In `supabase/functions/enhanced-fact-generator/index.ts`, replace `generateEnhancedRAGPrompt` for the modern branch with a prompt that:

- **Bans the formulaic opener**. Explicit rule: "Never start two facts with the same 3 words. Vary openings: questions, surprising stats, anecdotes, 'Imagine…', direct quotes from textbooks."
- **Forces 8 different subject buckets** — one fact each from: Science, History, Geography, Health/Body, Tech/Computing, Math/Logic, Language/Literature, Culture/Society.
- **Demands country- and era-specific anchors**: must reference at least one of {a real textbook series of that era in that country, a specific curriculum reform, a named teacher-training college, a specific exam/Abitur/SAT topic, a real TV educational show}.
- **Bans the overused list** (bats blind, tongue map, Great Wall, Vikings horns, ulcers/H. pylori, seasons tilt, 10% brain) **unless** the fact adds a new angle.
- **Mind-blow built in**: the `fact` field itself must contain the surprise. `mindBlowingFactor` becomes a one-line "why this matters today" hook.
- **Adds a "specificity test"**: every fact must contain at least one concrete number, name, or place beyond country+year.
- Raise `temperature` to **0.85** and `top_p` 0.95 for the modern prompt; keep low temp only for the historical (<1800) branch where accuracy matters more.

### 2. Add a regenerate / variety mechanism

- Add an optional `seed` (random int) to the request and include it in the cache key. The frontend passes a fresh seed when the user clicks a new "🎲 Generate fresh set" button → bypasses cache and produces different facts for the same country/year.
- Keep the original cache for first-load speed; only the explicit button forces a new generation.

### 3. Diversity post-filter

After parsing, before validation:
- Reject the result and re-prompt **once** if >2 facts share the same category, or if the Jaccard similarity threshold (already in `findDuplicates`) catches >1 near-duplicate. Lower the dedup threshold from 0.6 → 0.45 to be stricter.

### 4. Small UX wins on the result UI

In `FactsDebunker.tsx`:
- Add the "🎲 Show me different facts" button next to the results header (calls the function with a new seed).
- Show the **category as a coloured pill** at the top of each card so variety is visible at a glance.
- Surface `mindBlowingFactor` as a highlighted callout ("💡 Why this still matters") instead of a plain paragraph.

### 5. Index page polish (since user is on `/`)

- Move the Bot + Quiz CTA cards **above** `MindBlowingFacts` so first-time visitors see the interactive entry points immediately on a 360px viewport.
- Add a one-line subtitle under the main headline explaining "Pick your country and graduation year — we'll show you what your school got wrong."

## Files to change

```
supabase/functions/enhanced-fact-generator/index.ts   -- new prompt, temp 0.85, seed support, stricter dedup
src/components/FactsDebunker.tsx                      -- regenerate button, category pill, callout, pass seed
src/pages/Index.tsx                                   -- reorder CTA above MindBlowingFacts, add subtitle
src/lib/i18n.ts                                       -- new strings: "regenerate", "whyItMatters", subtitle
```

No DB migration. No new dependency.

## Out of scope (can do later)
Leaderboard, sound effects, PWA, newsletter — already on the backlog.

