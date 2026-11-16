# Auftrag: „Pomalo" – Kroatisch-Lern-App fürs iPhone (PWA)

## Ziel

Baue mir eine Kroatisch-Lern-App nach dem Lernprinzip von Duolingo: kurze Lektionen, Lernpfad, Streak, Wiederholung. Name, Design und Maskottchen sind eigenständig. Die App läuft als installierbare Web-App (PWA) auf meinem iPhone – in Safari öffnen, „Zum Home-Bildschirm", danach wie eine richtige App, auch offline – und wird kostenlos über GitHub Pages ausgeliefert. Es gibt genau einen Nutzer: mich.

Dieser Text ist die vollständige Spezifikation. Lege ihn zu Beginn unverändert als `docs/AUFTRAG.md` ab (falls er dort noch nicht liegt), damit spätere Sitzungen darauf zurückgreifen können. Wenn du einen Widerspruch oder eine klar bessere Lösung siehst, sag es im Plan in einem Satz.

## Über mich

* Muttersprache Deutsch, Kroatisch praktisch bei null (A0).
* Ziel: mit Familie und Freunden sprechen, zweitrangig Urlaub. Alltagssprache – Smalltalk, Familie, Essen, Treffen, Gefühle – kein Business. Deshalb ist „ti" (du) die Standardanrede; „Vi" (Sie) wird eingeführt und gekennzeichnet.
* Region meiner Familie und Freunde: Kroaten aus Bosnien, Region Gradacac. Umgangssprachliche Varianten sollen sich daran orientieren.
* Zeit: meist 5–10 Minuten am Tag, manchmal mehrere Lektionen am Stück.
* Ich brauche viel Motivation durch Spiel-Elemente.
* Ich bin kein Web-Entwickler und habe ein frisch angelegtes GitHub-Konto.

## Zusammenarbeit

* Sprich Deutsch mit mir, kurz und ohne Fachjargon; wenn ein Fachbegriff nötig ist, erkläre ihn in einem Halbsatz. Beginne jede Rückmeldung mit dem Ergebnis: was ist fertig, was brauchst du von mir.
* Technische Entscheidungen triffst du selbst und nennst sie mir in einem Satz. Frag mich nur, wenn die Antwort verändert, was ich als Lerner bekomme (Inhalte, Spielregeln, Aussehen), oder wenn etwas nur ich tun kann (Klicks bei GitHub, Schritte am iPhone).
* Code, Dateinamen und Commit-Nachrichten auf Englisch. Alles, was ich lese – App-Oberfläche, README, Anleitungen –, auf Deutsch.
* Das Projekt startet leer. Nutze Git von Anfang an, mit einem Commit pro abgeschlossenem Arbeitsschritt.

## Ablauf

**Phase 1 – Plan, dann anhalten.** Lege mir einen Plan vor, den ich in fünf Minuten lesen kann, und warte auf mein OK:

1. Lehrplan: alle Einheiten mit Titel, Grammatikthema und Lektionstiteln; für die Einheiten 1–6 zusätzlich die geplanten Wörter je Lektion.
2. Spielregeln (XP, Streak, Streak-Schutz, Stufen, Tagesziel) auf Basis der Standardregeln unten.
3. Design-Richtung in drei, vier Sätzen.
4. Technik in fünf Zeilen, Projektstruktur, und das Inhaltsformat an einem Beispiel (ein Wort, ein Satz, eine Lektion).
5. Höchstens fünf offene Fragen an mich.

**Phase 2 – Bauen, ohne Zwischenfreigaben.** Nach meinem OK arbeitest du die Meilensteine selbstständig nacheinander ab. Halte nur an, wenn ohne mich nichts weitergeht. Nach jedem Meilenstein: Tests grün, Commit, `docs/STATUS.md` aktualisieren (was fertig ist, was als Nächstes kommt), zwei, drei Sätze an mich. Vorschlag für die Meilensteine, die Reihenfolge darfst du im Plan anpassen:

* M1 Grundgerüst: Projekt, PWA-Hülle, Navigation, Speichern, Design-Grundlage, Lernpfad.
* M2 Lektions-Engine: alle Übungsarten, Antwortbewertung, Audio – mit den Inhalten der Einheiten 1–2.
* M3 Motivation und Wiederholung: XP, Streak, Tagesziel, Stufen, Abzeichen, Spaced Repetition, Vokabel-Übersicht, Statistik, Einstellungen, Export/Import.
* M4 Inhalte: Einheiten 1–6 vollständig, inklusive Kroatisch-Korrektur.
* M5 Feinschliff: Offline, Update-Verhalten, iPhone-Details, End-to-End-Tests, Deployment.

**Phase 3 – Veröffentlichen, gemeinsam.** Prüfe zuerst, ob `git` und die GitHub-CLI (`gh`) hier verfügbar und angemeldet sind. Wenn ja, legst du nach meiner Bestätigung das Repository an, aktivierst GitHub Pages und pushst selbst. Wenn nicht, führst du mich durch: ein Schritt pro Nachricht, mit genauer Angabe, wo ich klicke und was ich eintippe, und du wartest jeweils auf mein „erledigt". Danach die Installation auf dem iPhone und die Checkliste „Auf dem iPhone prüfen" (siehe Qualität).

**Phase 4 – Erweitern.** Später sage ich nur noch „Füge Einheit 7 hinzu". Der Ablauf dafür steht in `CLAUDE.md` (siehe Dokumentation).

## Technik

* Vite + TypeScript (strict), ohne schweres Framework (Vanilla TS oder Preact – entscheide du). Kein Backend, kein Login, kein Tracking, keine externen Ressourcen zur Laufzeit (keine CDNs, keine fremden Web-Fonts), damit die App offline funktioniert und keine Daten abfließen.
* PWA mit Manifest und Service Worker, der die App und alle Inhalte vollständig vorab speichert (z. B. über vite-plugin-pwa).
* GitHub Pages liefert unter `https://<nutzer>.github.io/<repo>/` aus, also in einem Unterpfad: `base` in Vite passend setzen, Manifest (`start\_url`, `scope`), Service Worker und Icons relativ dazu. Navigation ohne serverseitiges Routing (Hash- oder Zustands-Navigation), weil GitHub Pages beim direkten Aufruf von Unterseiten sonst „404" zeigt.
* Deployment per GitHub Action bei jedem Push auf `main` (offizielle Pages-Actions, Pages-Quelle „GitHub Actions"). Die Action führt vorher Tests und Inhaltsprüfung aus; schlägt etwas fehl, wird nicht veröffentlicht.
* Mit kostenlosem GitHub-Konto muss das Repository öffentlich sein. Deshalb keine persönlichen Daten ins Repository; mein Lernfortschritt bleibt ausschließlich auf dem Gerät.
* Fortschritt lokal als ein versioniertes Zustandsobjekt (localStorage genügt, IndexedDB nur mit gutem Grund), mit `schemaVersion` und Migrationen, damit App-Updates und neue Einheiten nie Fortschritt zerstören. Fortschritt hängt an stabilen IDs für Wörter und Lektionen, die sich nie ändern.
* Backup: „Fortschritt exportieren/importieren" als Datei und als Text zum Kopieren; Import mit Prüfung und Sicherheitsabfrage.
* Updates: Eine neu veröffentlichte Version soll in der installierten App zuverlässig ankommen – beim Öffnen nach Updates suchen, außerhalb einer laufenden Lektion automatisch übernehmen, Version und Datum in den Einstellungen anzeigen. Installierte iOS-Web-Apps halten alte Versionen sonst hartnäckig fest.
* Oberfläche komplett auf Deutsch, Dark Mode nach Systemeinstellung, für Hochformat gestaltet.

## iPhone-Besonderheiten

Du kannst nicht auf einem echten iPhone testen, deshalb stehen diese Punkte ausdrücklich hier.

* Vollbild: `viewport-fit=cover`, Safe Areas über `env(safe-area-inset-\*)` (Notch, Home-Indikator), Höhen über `dvh`, apple-touch-icon (180×180 PNG ohne Transparenz), Statusleiste und `theme-color` passend für Hell und Dunkel.
* Eingabefelder: Schrift mindestens 16 px (sonst zoomt Safari beim Antippen); Autokorrektur, automatische Großschreibung und Rechtschreibprüfung aus (sonst „verbessert" das iPhone kroatische Wörter); eine Leiste mit den Tasten č ć đ š ž direkt über der Tastatur; der „Prüfen"-Button bleibt bei geöffneter Tastatur sichtbar.
* Bedienung: Tippflächen mindestens 44×44 pt, kein Doppeltipp-Zoom, kein Gummiband-Scrollen der ganzen Seite, keine versehentliche Textauswahl auf Buttons.
* Getrennter Speicher: Safari-Tab und installierte App teilen ihren Fortschritt nicht. Läuft die App im Browser-Tab, zeige deshalb zuerst die Installationsanleitung („Teilen → Zum Home-Bildschirm"), mit der Möglichkeit, trotzdem im Browser weiterzumachen. Fordere dauerhaften Speicher an (`navigator.storage.persist()`), wo verfügbar.
* iOS entlädt Web-Apps im Hintergrund oft. Der Zwischenstand einer laufenden Lektion wird deshalb gesichert, damit ein kurzer App-Wechsel die Lektion nicht zurücksetzt.

## Erster Start

Kurze Begrüßung mit dem Maskottchen, Tagesziel wählen, Ich-Form wählen (siehe Inhalte) und ein Audio-Test: „Hörst du die kroatische Stimme?" Der Test liefert zugleich die erste Nutzer-Interaktion, die iOS für Ton verlangt, und deckt eine fehlende Stimme sofort auf.

## Sprache und Inhalte

* Standard-Kroatisch, ijekavisch (mlijeko, vrijeme), lateinische Schrift. Keine serbischen oder bosnischen Varianten. Typische Verwechslungen: kruh (nicht hleb), tjedan (nicht nedelja/sedmica), tisuća (nicht hiljada), vlak (nicht voz), kava (nicht kafa), sretan (nicht srećan), točno (nicht tačno), tko (nicht ko), kroatische Monatsnamen (siječanj, veljača …), Infinitiv statt da-Konstruktion (želim jesti, nicht želim da jedem).
* Wo die Alltagssprache unter Freunden und in der Familie vom Lehrbuch abweicht, zeige beides und markiere es als „umgangssprachlich" (z. B. što – umgangssprachlich oft šta).
* Du erstellst Lehrplan und Inhalte selbst: logisch aufbauend, die häufigsten und für Familiengespräche nützlichsten Wörter zuerst. Vokabeln sind das Wichtigste.
* Pro Vokabel: stabile ID, kroatisch, deutsch (mit akzeptierten Alternativen), Wortart; bei Nomen das Geschlecht (m/f/n); bei Verben Infinitiv + 1. Person Singular Präsens (govoriti – govorim); bei Adjektiven die Formen m/f/n; bei Bedarf eine Anmerkung (z. B. unregelmäßig) und die Markierung „umgangssprachlich"; ein Beispielsatz mit Übersetzung.
* Pro Satz: kroatisch, deutsch und alle akzeptierten Varianten in beide Richtungen.
* Grammatik spielerisch: Vor einer Lektion mit neuem Grammatikthema kommt eine Tipp-Karte (höchstens 3–4 Sätze, einfaches Deutsch, Beispiele, Vergleich zum Deutschen, wo er hilft). Danach wird das Thema in den Übungen trainiert, z. B. Endung ergänzen. Die Tipp-Karten sind später nachlesbar.
* Manche Formen hängen vom Geschlecht der sprechenden Person ab (umoran/umorna, bio sam/bila sam). Die App fragt beim ersten Start, welche Ich-Form ich verwende; Aufgaben über mich selbst nutzen diese Form, die andere wird trotzdem gelehrt.
* Aufbau: Einheit → 4–6 Lektionen. Eine Lektion dauert etwa 5 Minuten: 10–15 Aufgaben, 5–8 neue Wörter.
* Grobe Reihenfolge (verfeinere sie): Aussprache \& Alphabet → Begrüßen \& Vorstellen → biti (sein) \& Personalpronomen → Familie → Zahlen \& Alter → Geschlecht der Nomen → Essen \& Trinken → Verben im Präsens (-ati / -iti / -jeti) → Akkusativ → Fragen stellen → Besitz (moj, tvoj …) → Zuhause → Wochentage \& Uhrzeit → Treffen \& Verabredungen → Lokativ (u/na) → Gefühle \& Befinden → Hobbys → Wetter → Feste \& Familienfeiern → Urlaub \& Reisen → Vergangenheit (Perfekt) → Zukunft → weitere Fälle.
* Einheit 1 (Aussprache) ist ein Sonderfall: Buchstaben und Laute im Vergleich zum Deutschen (č ≈ tsch, š ≈ sch, ž wie das j in „Journal", c ≈ deutsches z, z = stimmhaftes s, h ≈ ch, dazu ć, dž, đ, lj, nj und das gerollte r), geübt über Hören und über Beispielwörter, die ich später ohnehin brauche. č/ć und dž/đ klingen in der Sprachausgabe praktisch gleich – diese Paare über die Schreibweise lernen, nicht als Hör-Unterscheidung abfragen.
* Umfang der ersten Version: vollständiger Lehrplan für alle Einheiten in `docs/LEHRPLAN.md` (mit Status je Einheit), Einheiten 1–6 komplett mit Inhalten. Spätere Einheiten erscheinen im Lernpfad als „kommt bald".
* Korrektheit geht vor Menge: lieber weniger, dafür richtig.

## Inhaltsformat

* Inhalte strikt getrennt vom Code: eine JSON-Datei pro Einheit mit Vokabeln, Sätzen, Grammatik-Tipps und Lektionen. Eine neue Einheit ist eine neue Datei, ohne Änderung am Code.
* Die Aufgaben einer Lektion werden möglichst aus Vokabeln und Sätzen erzeugt (Auswahl, Paare, Bausteine, Tippen, Hören) statt einzeln von Hand geschrieben. Von Hand kommen nur Aufgaben dazu, die sich nicht ableiten lassen, etwa Lückentexte zu Endungen. Das hält die Dateien klein, vermeidet Fehler und ermöglicht den Wiederholen-Modus.
* Ein Prüfskript (`npm run check:content`) validiert alle Inhaltsdateien: Schema, eindeutige IDs, gültige Verweise, Pflichtfelder (Geschlecht bei Nomen, Präsensform bei Verben), 5–8 neue Wörter und 10–15 Aufgaben pro Lektion, Satzbausteine ergeben den Zielsatz, keine unerwarteten Zeichen in kroatischen Feldern (z. B. Kyrillisch oder falsche Akzentbuchstaben).

## Übungsarten

Guter Mix in jeder Lektion, in sinnvoller Lernreihenfolge: kennenlernen → erkennen → zuordnen → bauen → selbst tippen, Hören dazwischen.

1. Neues Wort einführen: Wort, Übersetzung, Audio, Beispielsatz.
2. Multiple Choice: Bedeutung auswählen (DE→HR und HR→DE).
3. Paare zuordnen: 5 Paare antippen.
4. Übersetzung eintippen (DE→HR und HR→DE).
5. Satz aus Wortbausteinen bauen, mit einigen Ablenk-Bausteinen.
6. Lückentext / Endung ergänzen (Grammatik).
7. Hören: Audio anhören, dann auswählen oder eintippen, was gesagt wurde.
8. Sprechen als Selbstcheck: Satz anhören, nachsprechen, „Ich hab's gesagt". Überspringbar und abschaltbar. Spracherkennung ist in installierten iOS-Web-Apps nicht verlässlich, deshalb gehört sie nicht in die erste Version; baue so, dass sie sich später hinter einer Feature-Erkennung ergänzen lässt.

Dazu:

* Sofortiges Feedback nach jeder Antwort mit der richtigen Lösung.
* Falsch beantwortete Aufgaben kommen am Ende der Lektion noch einmal.
* Schalter „Gerade kein Ton": Hör- und Sprechaufgaben werden für diese Lektion ersetzt.
* Lektion abbrechen ist möglich, mit Rückfrage.

## Bewertung beim Tippen

* Ignoriert werden Groß-/Kleinschreibung, Satzzeichen und überzählige Leerzeichen.
* Fehlende Sonderzeichen (c statt č/ć, s statt š, z statt ž, d/dj statt đ) gelten als „fast richtig": zählt als richtig, die korrekte Schreibweise wird hervorgehoben.
* Ein kleiner Tippfehler bei längeren Wörtern (ab 5 Buchstaben) ist ebenfalls „fast richtig". Ausnahme: Wenn die Aufgabe genau die Endung oder Form prüft, oder wenn der Tippfehler ein anderes existierendes Wort bzw. eine andere Form ergibt (kava/kavu), wird streng bewertet. Sonst winkt die Toleranz genau die Fehler durch, die ich lernen soll.
* Deutsche Antworten: ae/oe/ue/ss für ä/ö/ü/ß akzeptieren, Artikel optional.
* Mehrere korrekte Lösungen akzeptieren: Synonyme, zulässige Wortstellungen, mit oder ohne Personalpronomen (Ja sam umoran / Umoran sam), du/Sie-Varianten, wo sie passen.

## Audio

* Sprachausgabe über die Web Speech API (`speechSynthesis`) mit kroatischer Stimme (`hr-HR`). Lautsprecher-Button an jedem Wort und Satz, Schildkröten-Button für langsames Abspielen.
* iOS-Eigenheiten: Ton erst nach einer Nutzer-Interaktion; die Stimmenliste lädt verzögert; laufende Ausgabe vor einer neuen abbrechen. Automatisches Vorlesen ist ein Bonus – jede Höraufgabe hat immer einen gut sichtbaren Abspiel-Button.
* Wird keine kroatische Stimme gefunden: klarer Hinweis mit Anleitung, wie ich sie in den iPhone-Einstellungen lade. Recherchiere den aktuellen Menüpfad, statt ihn zu raten. Höraufgaben werden dann übersprungen, statt die Lektion zu blockieren.
* Falls sich die Sprachausgabe beim iPhone-Test als unzuverlässig erweist, schlage als Plan B vorab erzeugte Audiodateien vor – aber erst dann.
* Effekt-Töne (richtig, falsch, Lektion geschafft) per Web Audio erzeugt, ohne Audiodateien; abschaltbar.

## Motivation

Standardregeln – im Plan darfst du Besseres vorschlagen:

* XP: 10 pro Lektion, +5 für fehlerfrei; Wiederholung 10; „Schnell üben" 5.
* Tagesziel: 1, 2, 3 oder 5 Lektionen pro Tag (Wiederholungen zählen mit), jederzeit änderbar; mehr geht immer.
* Streak mit Flamme: Ein Tag zählt, sobald ich mindestens eine Lektion, Wiederholung oder Schnell-üben-Runde abgeschlossen habe, unabhängig vom Tagesziel. Tageswechsel nach lokaler Uhrzeit, gerechnet in Kalendertagen statt in 24-Stunden-Abständen (Zeitumstellung, Reisen).
* Streak-Schutz: alle 7 Streak-Tage einen verdienen, höchstens 2 auf Vorrat. Er wird automatisch eingesetzt, wenn ich einen Tag verpasse, und die App sagt es mir beim nächsten Öffnen.
* Lernpfad: Pfad mit Einheiten und Lektionen. Die nächste Lektion wird frei, sobald die vorige einmal geschafft ist. Jede Lektion hat 3 Stufen (Kronen); höhere Stufen bringen mehr Tippen und Hören, weniger Auswahl.
* Abzeichen: 12–15 Stück, z. B. „100 Wörter gelernt", „7-Tage-Streak", „Fälle-Profi", „Fehlerfrei".
* Feiern: Animationen, Konfetti, kurze Töne, motivierende Sprüche, gern mit kroatischen Einsprengseln (Bravo!, Odlično!, Svaka čast!). `prefers-reduced-motion` respektieren.
* Maskottchen: eine eigene, originelle Figur – ein kleiner Dalmatiner (Namensvorschlag: Točka, „Punkt") – als SVG in mehreren Stimmungen: freut sich, feuert an, tröstet, schläft.
* Statistik-Seite: gelernte Wörter, XP-Verlauf der letzten 7 Tage, Streak aktuell und Rekord.

## Design

Vorschlag für die Richtung, im Plan bestätigen oder Gegenvorschlag machen: verspielt und freundlich, Farbwelt Adria (Meerblau/Türkis als Hauptfarbe, Sonnengelb für XP und Streak, Korallenrot als Akzent), Dalmatiner-Punkte als wiederkehrendes Motiv, große runde Formen, klare Kontraste in Hell und Dunkel, Systemschrift. Keine Anlehnung an Duolingo: kein Grün als Leitfarbe, keine Eulen- oder Vogelfigur, keine Duolingo-Grafiken, -Töne oder -Texte.

## Wiederholung (Spaced Repetition)

* Jede Vokabel hat eine Stärke und ein Fälligkeitsdatum (Leitner mit 5 Stufen oder SM-2 – nimm das Einfachere, das gut funktioniert). Jede Antwort in Lektion oder Wiederholung aktualisiert beides.
* „Wiederholen": 10–15 Aufgaben, fällige Wörter zuerst, dann schwache.
* „Schnell üben": 2–3 Minuten, 6–8 Aufgaben, nur schnelle Aufgabentypen.
* Vokabel-Übersicht: alle gelernten Wörter mit Stärke-Anzeige, Audio, Details (Geschlecht, Formen, Beispielsatz) und Suche, die auch ohne Sonderzeichen findet („sto" findet „što").
* Die Startseite zeigt, wie viele Wörter fällig sind.

## Qualität

* Automatische Tests, lokal und in der GitHub Action: Antwortbewertung, Wiederholungs-Logik, Streak und Tagesziel inklusive Datumsgrenzen, Stufen und Freischaltung, Speichern, Migration, Export/Import, Inhaltsprüfung.
* End-to-End im iPhone-Viewport (Playwright, möglichst mit WebKit): erster Start → eine Lektion komplett → Fortschritt ist nach dem Neuladen noch da → die gebaute App funktioniert offline. Wenn sich etwas davon hier nicht ausführen lässt, sag das ausdrücklich, statt es als getestet zu melden.
* Kroatisch-Korrektur als fester Arbeitsschritt je Einheit, bevor sie als fertig gilt. Jedes kroatische Wort und jeder Satz wird geprüft auf: Schreibweise und Sonderzeichen; Geschlecht; Fall-Endungen (Akkusativ: Pijem kavu; belebte Maskulina: Imam brata); Verbformen; Kurzformen an zweiter Stelle (Zovem se Ana, nicht Se zovem Ana); ijekavisch und kroatischer Wortschatz (Liste oben); und ob man es in der Familie wirklich so sagt. Zweifelsfälle in verlässlichen Quellen nachschlagen (z. B. Hrvatski jezični portal, Wiktionary) und, wenn es unklar bleibt, streichen statt raten.
* Führe in `docs/GEGENLESEN.md` eine kurze Liste der Stellen, bei denen du unsicher warst. Ich lasse sie von Muttersprachlern in meiner Familie gegenlesen.
* Checkliste „Auf dem iPhone prüfen" für mich, weil du das nicht testen kannst: Installation; Vollbild und Safe Areas; kroatische Stimme normal und langsam; Tippen mit Sonderzeichen-Leiste ohne Zoom; Flugmodus; Fortschritt nach App-Neustart; Update kommt an; Export/Import.

## Fertig ist die erste Version, wenn

1. die Einheiten 1–6 von der ersten bis zur letzten Lektion spielbar sind und alle acht Übungsarten vorkommen,
2. Tests, Inhaltsprüfung und Build fehlerfrei laufen, lokal und in der GitHub Action,
3. die App über GitHub Pages erreichbar ist, sich installieren lässt, offline funktioniert und den Fortschritt behält,
4. README, CLAUDE.md, LEHRPLAN und STATUS aktuell sind,
5. ich die iPhone-Checkliste durchgespielt habe und die gemeldeten Probleme behoben sind.

## Dokumentation

* `README.md`, deutsch, für mich: was die App ist, wie ich sie veröffentliche und aktualisiere, wie ich meinen Fortschritt sichere, wie neue Einheiten dazukommen.
* `CLAUDE.md`, kurz, für künftige Sitzungen: Befehle, Projektstruktur in Stichworten, Verweis auf `docs/AUFTRAG.md` und `docs/LEHRPLAN.md`, und der Ablauf „Einheit hinzufügen": Lehrplan lesen → JSON schreiben → Inhaltsprüfung → Kroatisch-Korrektur → Tests → LEHRPLAN und STATUS aktualisieren → Commit und Push.
* `docs/LEHRPLAN.md`, `docs/STATUS.md`, `docs/GEGENLESEN.md` wie oben beschrieben.

## Nicht-Ziele

Bitte nicht bauen, auch wenn es naheliegt: Konten oder Synchronisation zwischen Geräten, Push-Benachrichtigungen, Bestenlisten oder soziale Funktionen, ein Herzen-/Leben-System, Käufe, weitere Sprachen, Optimierung für Android oder Desktop über „funktioniert" hinaus.

