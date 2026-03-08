

## Plan: "Mind-Blowing Facts" Wow-Section hinzufügen

### Idee
Eine neue, visuell auffällige Sektion auf der Startseite, die 10 handverlesene "Sounds Fake But True"-Fakten zeigt -- unabhängig vom Country/School Mode. Diese Sektion soll den Wow-Faktor liefern und die trockene Präsentation auflockern.

### Kuratierte Fakten (aus BBC Science Focus + ScienceNewsToday)
1. **Haie existierten vor Bäumen** -- 400 Mio. Jahre vs. 350 Mio.
2. **Ein Tag auf der Venus dauert länger als ein Venus-Jahr** -- 243 vs. 225 Erdtage
3. **Wasser kann gleichzeitig kochen und gefrieren** -- Triple Point
4. **Faultiere können länger die Luft anhalten als Delfine** -- 40 Min vs. 10 Min
5. **Oktopusse haben 3 Herzen und blaues Blut** -- Kupfer statt Eisen
6. **Deine DNA reicht 330x zur Sonne und zurück** -- 74 Billionen Meter
7. **Bananen sind Beeren, Erdbeeren nicht** -- Botanische Definition
8. **Kettensägen wurden für Geburten erfunden** -- 18. Jahrhundert, Schottland
9. **Nilpferde können nicht schwimmen** -- Sie galoppieren am Flussboden
10. **Eine Wolke wiegt ca. 1 Million Tonnen** -- BBC Science Focus

### UI-Design
- Neue Komponente `MindBlowingFacts.tsx`
- Interaktive Karten im Grid-Layout (2 Spalten Desktop, 1 Spalte Mobile)
- Jede Karte hat:
  - Emoji-Icon passend zum Thema
  - "Sounds Fake" Badge oben
  - Fakt-Headline (fett, kurz)
  - "But it's true!"-Erklärung (aufklappbar oder direkt sichtbar)
  - Quelle als kleiner Link
- Animierter Einstieg: Karten erscheinen mit Stagger-Animation beim Scrollen
- Gradient-Akzente passend zum bestehenden Design-System
- Header mit Typewriter-Effekt oder großem Emoji: "🤯 Sounds Fake, But It's True"

### Integration
- In `Index.tsx` zwischen `<FactsDebunker />` und `<FAQSection />` einbauen
- Eigenständige Komponente, kein Backend/API nötig (statische Daten)

### Technische Details
- `src/components/MindBlowingFacts.tsx` erstellen
- Statisches Array mit den 10 Fakten (Titel, Erklärung, Emoji, Quelle mit URL)
- Tailwind-Animationen für Card-Reveal (Intersection Observer oder CSS-only)
- Mobile-first: `grid-cols-1 sm:grid-cols-2` Layout
- `Index.tsx` um Import und Einbindung erweitern

