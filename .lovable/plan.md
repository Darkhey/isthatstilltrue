

# Gen Alpha Fact-Checker Bot

Ein Chat-Interface im Messenger-Stil, in dem Schuler Fragen wie "Stimmt es, dass Pluto ein Planet ist?" stellen und sofort eine gestreamte Antwort mit Quellen bekommen.

## Architektur

### 1. Neue Edge Function: `school-fact-chat`
- Streaming-Endpoint (SSE) uber Lovable AI Gateway
- System-Prompt: jugendlicher, lockerer Ton ("no cap", Emojis), aber faktisch korrekt mit verifizierten Quellen
- Modell: `google/gemini-3-flash-preview` (schnell + gunstig)
- Conversation History: kompletter Chatverlauf wird mitgeschickt (kein DB-Persist notig)
- Strukturierte Antwort: Fakt-Check-Ergebnis + Erklarung + Quellen inline im Markdown

### 2. Neue Komponente: `SchoolFactChat.tsx`
- Chat-Bubble UI im Messenger-Stil (User rechts, Bot links)
- Input-Feld unten mit Send-Button
- Token-by-Token Streaming (SSE-Parsing wie in den Best Practices)
- Markdown-Rendering fur Bot-Antworten (react-markdown installieren)
- Vorschlags-Chips fur Einstiegsfragen ("Ist Pluto noch ein Planet?", "Haben wir 5 Sinne?", "Ist Glas eine Flussigkeit?")
- Mobile-first Design, Gen-Alpha-freundliche Asthetik (Gradient-Bubbles, Emojis)

### 3. Integration
- Neue Route `/ask` mit eigener Seite + SEOHead
- Link im Footer + prominent auf der Index-Seite als eigene Section
- Navigation aktualisieren
- Sitemap erweitern

### 4. Config
- `supabase/config.toml`: neuen Function-Eintrag `school-fact-chat` mit `verify_jwt = false`

## Dateien

```text
Neu:
  supabase/functions/school-fact-chat/index.ts   -- Streaming Edge Function
  src/components/SchoolFactChat.tsx               -- Chat-Interface
  src/pages/AskBot.tsx                            -- /ask Seite

Geandert:
  src/App.tsx                                     -- Route /ask
  src/components/Footer.tsx                       -- Link zu /ask
  src/pages/Index.tsx                             -- CTA-Section zum Bot
  public/sitemap.xml                              -- /ask hinzufugen
```

## Abhangigkeit
- `react-markdown` installieren fur Markdown-Rendering in Chat-Bubbles

