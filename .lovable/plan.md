

## Fehleranalyse und Verbesserungsplan

Nach gründlicher Durchsicht des gesamten Systems habe ich folgende Probleme und Schwachstellen identifiziert:

---

### Bug 1: Memory Leak durch Loading-Interval
In `FactsDebunker.tsx` wird `startLoadingMessageRotation()` aufgerufen, das ein `setInterval` startet. Dieses Interval prüft `isLoading` — aber da es den Wert zum Zeitpunkt des Aufrufs erfasst (Closure), wird es nie korrekt gestoppt. Außerdem wird `clearInterval(messageInterval)` im `finally`-Block aufgerufen, aber wenn die Komponente vorher unmountet wird, läuft das Interval weiter.

**Fix:** `useRef` für das Interval verwenden und in einem `useEffect`-Cleanup aufräumen.

---

### Bug 2: "Back"-Button setzt alles zurück statt nur einen Schritt
Der "Back"-Button auf Step 2 ruft `resetForm()` auf, was alle Felder (inkl. Country, School-Daten) komplett löscht. Der User muss alles neu eingeben.

**Fix:** Neuen `handleBack()`-Handler erstellen, der nur `setStep(1)` setzt und die eingegebenen Daten beibehält.

---

### Bug 3: Loading-Meldungen versprechen Features die nicht existieren
Die Loading-Screen-Texte sagen "Collecting school photos", "Searching newspaper archives" — aber die Edge Function nutzt nur Wikipedia. Es werden keine Fotos gesammelt und keine Zeitungsarchive durchsucht. Das ist irreführend.

**Fix:** Loading-Texte an die tatsächliche Funktionalität anpassen (Wikipedia-Recherche, historische Fakten).

---

### Bug 4: `researchResults` wird nie zurückgegeben
Der Frontend-Code prüft `data.researchResults?.schoolImages`, `data.researchResults?.cityImages`, `data.researchResults?.historicalSources` — aber die Edge Function `research-school-memories` gibt diese Felder gar nicht zurück. Toter Code.

**Fix:** Entweder die Felder in der Response hinzufügen oder den toten Code im Frontend entfernen.

---

### Bug 5: Wikipedia-Quellen werden nicht angezeigt
Die Edge Function gibt `wikipediaSources` zurück, aber das Frontend speichert und zeigt diese nirgends an. Der User sieht nie, welche echten Quellen verwendet wurden.

**Fix:** `wikipediaSources` aus der Response lesen und als eigene Sektion unter den Ergebnissen anzeigen.

---

### Schwachstelle 6: SchoolMemoryCard-Interface-Mismatch
`SchoolMemoryData` in `FactsDebunker.tsx` (Zeile 52-67) hat keine `sourceUrl`/`sourceName`-Felder, aber die Edge Function gibt diese zurück und `SchoolMemoryCard.tsx` erwartet sie. TypeScript kann die fehlenden Felder nicht prüfen.

**Fix:** Interface in FactsDebunker aktualisieren, damit `sourceUrl` und `sourceName` als optionale Felder enthalten sind.

---

### Schwachstelle 7: Keine Fehlerbehandlung bei JSON-Parse in Edge Function
Wenn die AI-Antwort kein valides JSON ist, crasht `JSON.parse(cleanJsonResponse(aiContent))` in `research-school-memories` ohne Fallback-Response.

**Fix:** Try-catch um den Parse-Block und eine sinnvolle Fallback-Response zurückgeben.

---

## Umsetzungsplan

### Task 1: Memory Leak und Interval-Bug fixen
- `startLoadingMessageRotation` durch einen `useRef`-basierten Ansatz ersetzen
- Cleanup im `finally`-Block sicherstellen

### Task 2: Back-Button reparieren  
- Neuen `handleBack()`-Handler: setzt nur `step` auf 1, behält alle eingegebenen Daten

### Task 3: Irreführende Loading-Texte korrigieren
- Texte auf "Researching Wikipedia sources...", "Analyzing historical context..." etc. ändern
- "Collecting school photos" und "Searching newspaper archives" entfernen

### Task 4: Toten Code entfernen + Wikipedia-Quellen anzeigen
- `researchResults`-Checks entfernen (schoolImages, cityImages, historicalSources aus school mode)
- `wikipediaSources` aus der Response lesen und als Quellen-Sektion anzeigen

### Task 5: Interface-Typen synchronisieren
- `SchoolMemoryData` in FactsDebunker um `sourceUrl`/`sourceName` erweitern

### Task 6: JSON-Parse Fallback in Edge Function
- Try-catch um `JSON.parse` in `research-school-memories` mit sinnvoller Fallback-Response

