# Status

Stand: 17.11.2026

## Fertig
- **M1 Grundgerüst**: Vite + TypeScript + Preact, PWA (Manifest, Service Worker, Icons), Hash-Navigation, Speichern mit `schemaVersion` und Migrationen, Adria-Design hell/dunkel, Lernpfad, Erster Start, Installationsanleitung im Browser-Tab.
- **M2 Lektions-Engine**: acht Übungsarten, Antwortbewertung (Sonderzeichen, Tippfehler, Varianten, strenge Endungsaufgaben), Sprachausgabe normal/langsam, Effekt-Töne, falsche Aufgaben am Ende nochmal, „Gerade kein Ton“, Abbrechen mit Rückfrage, Zwischenstand bleibt beim App-Wechsel erhalten.
- **M3 Motivation & Wiederholung**: XP, Tagesziel, Streak mit Streak-Schutz, 3 Stufen pro Lektion, 14 Abzeichen, Konfetti, Leitner-Wiederholung, Schnell üben, Wörter-Übersicht mit Suche ohne Sonderzeichen, Statistik, Einstellungen, Export/Import.
- **M4 Inhalte**: Einheiten 1–6 komplett (34 Lektionen, ~200 Wörter), Kroatisch-Korrektur gemacht, offene Punkte in `GEGENLESEN.md`.
- **M5 Feinschliff**: Update-Logik (beim Öffnen prüfen, nie während einer Lektion), iPhone-Details, End-to-End-Tests, GitHub Action für Test + Veröffentlichung, README, CLAUDE.md, iPhone-Checkliste.

## Tests
- 63 Unit-Tests grün, Inhaltsprüfung grün, Build grün.
- End-to-End (iPhone-Format): in Chromium lokal grün (erster Start → Lektion → Neuladen, Lektion übersteht Neuladen, Export/Import, offline).
- **Nicht lokal getestet**: WebKit (Safari-Engine) startet unter Windows nicht (fehlende Systembibliotheken). Läuft in der GitHub Action unter Linux.
- **Nicht testbar ohne iPhone**: siehe `docs/IPHONE-CHECKLISTE.md`.

- **Veröffentlicht**: https://chern96.github.io/pomalo/ – GitHub Action grün, End-to-End-Tests dort auch in WebKit grün (8/8).
- Österreich statt Deutschland als Herkunftsland; österreichische Antworten (servus, Erdäpfel, Hendl …) werden akzeptiert.

- **Einheiten 7–9**: Präsens (-ati/-iti/-jeti/-ovati, ići), Akkusativ komplett mit kurzen Pronomen (me, te, ga …), Fragewörter und Je li …? – 15 Lektionen, ~100 neue Wörter. Offene Punkte in `GEGENLESEN.md`.

## Als Nächstes
- iPhone: installieren, Checkliste (`docs/IPHONE-CHECKLISTE.md`) durchgehen.
- Danach: Einheit 7 („Was machst du?“).
