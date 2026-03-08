

# SEO & Sharing Masterplan for "Is That Still True?"

## Aktueller Stand

- **OG-Tags**: Vorhanden in `index.html`, aber statisch (nur eine Beschreibung/Bild fur alle Seiten)
- **Sharing**: `FactShare` teilt immer `https://isthatstilltrue.com` -- keine individuellen Share-URLs pro Fakt
- **Sitemap**: 4 Seiten (Home, Terms, Privacy, Imprint) -- keine Content-Seiten
- **Bilder**: Aktuelles `og-image.png` und Favicon sind ein Upload, kein professionelles Branding
- **Content-Seiten**: Nur legal pages, keine SEO-relevanten Inhaltsseiten

---

## Plan (6 Arbeitspakete)

### 1. OG-Image & Favicon generieren

- AI-Bildgenerierung (Lovable AI, `google/gemini-3-pro-image-preview`) nutzen, um ein professionelles OG-Image (1200x630) zu erstellen
- Motiv: Schulbuch/Wissenschaft-Thema, Text "Is That Still True?", ansprechend fur Social Media
- Gleiches Branding fur Favicon (als 512x512 PNG)
- Edge Function die das Bild generiert und in Storage hochladt
- `index.html` und `public/` aktualisieren

### 2. Dynamische OG-Tags pro Seite (React Helmet)

- `react-helmet-async` installieren
- Wrapper-Komponente `SEOHead` erstellen mit Props: `title`, `description`, `image`, `url`
- Auf jeder Seite einsetzen:
  - **Home**: Allgemeiner Titel + Beschreibung
  - **SchoolMemoryShare** (`/school/:slug`): Dynamisch mit Schulname, Stadt, Jahr
  - **Legal pages**: Eigene Titel
- Fur Social Crawler (die kein JS rendern): Server-Side Meta-Tags via Edge Function als Fallback erwagen

### 3. Shareable Fact-URLs

- Neue Route `/fact/:id` erstellen
- Beim Teilen eines Fakts: Fakt in DB speichern (neue Tabelle `shared_facts`) und kurze URL generieren
- `/fact/:id` Seite zeigt den einzelnen Fakt schon formatiert an mit:
  - Dynamischen OG-Tags (Fakt-Text als Description)
  - CTA "Discover more outdated facts from YOUR school years"
  - Share-Buttons
- `FactShare` aktualisieren: statt `isthatstilltrue.com` die individuelle Fakt-URL teilen

### 4. SEO-Content-Seiten

Neue statische Seiten mit SEO-relevanten Inhalten:

- **`/about`** -- "About Is That Still True?" mit Mission, Team, Methodik
- **`/how-it-works`** -- Erklarung der Funktionsweise, Screenshots, Trust-Signale
- **`/blog`** (optional, Phase 2) -- Artikelseiten zu Themen wie "10 Dinge die du in der Schule falsch gelernt hast"

Jede Seite bekommt eigene Meta-Tags, wird zur Sitemap hinzugefugt.

### 5. Sitemap & Robots.txt aktualisieren

- Sitemap erweitern um alle neuen Seiten (`/about`, `/how-it-works`, `/fact/:id`)
- `lastmod` Datum aktualisieren
- Optional: Dynamische Sitemap-Generierung via Edge Function fur `/fact/:id` und `/school/:slug` URLs

### 6. Strukturierte Daten erweitern

- JSON-LD auf Fakt-Seiten: `ClaimReview` Schema (Google Fact Check Markup)
- FAQ-Seite: `FAQPage` Schema (bereits teilweise vorhanden, erweitern)
- Breadcrumb-Schema auf Unterseiten

---

## Technische Details

```text
Neue Dateien:
  src/components/SEOHead.tsx          -- Wiederverwendbare Meta-Tag Komponente
  src/pages/About.tsx                 -- About-Seite
  src/pages/HowItWorks.tsx            -- How it Works-Seite
  src/pages/SharedFact.tsx            -- /fact/:id Einzelfakt-Seite

Neue DB-Tabelle:
  shared_facts (id uuid, fact_data jsonb, country text, graduation_year int, 
                created_at timestamptz, slug text unique)

Geanderte Dateien:
  index.html                          -- Favicon Update
  src/App.tsx                         -- Neue Routes
  src/components/FactShare.tsx        -- Share-URLs auf /fact/:id umstellen
  public/sitemap.xml                  -- Neue Seiten
  public/og-image.png                 -- Neues generiertes Bild
```

## Reihenfolge

1. OG-Image + Favicon generieren
2. `SEOHead` Komponente + auf allen Seiten einbauen
3. `shared_facts` Tabelle + `/fact/:id` Route + FactShare Update
4. Content-Seiten (`/about`, `/how-it-works`)
5. Sitemap + Strukturierte Daten

