# Pomalo – Kroatisch lernen

Pomalo ist deine eigene Kroatisch-Lern-App fürs iPhone. Kurze Lektionen, ein Lernpfad, Streak, Wiederholung – und Točka, der kleine Dalmatiner, der dich anfeuert. „Pomalo“ heißt so viel wie „immer mit der Ruhe, Schritt für Schritt“.

Die App ist eine **Web-App (PWA)**: Du öffnest sie einmal in Safari, legst sie auf den Home-Bildschirm und benutzt sie danach wie eine normale App – auch ohne Internet. Es gibt kein Konto und keine Werbung. Dein Lernfortschritt bleibt nur auf deinem iPhone.

## Was drin ist

- 25 Einheiten im Lehrplan, davon die Einheiten 1–6 komplett spielbar (siehe [docs/LEHRPLAN.md](docs/LEHRPLAN.md)).
- Acht Übungsarten: neues Wort, Auswahl, Paare, Übersetzen, Satzbausteine, Lückentext, Hören, Nachsprechen.
- XP, Tagesziel, Streak mit Streak-Schutz, drei Stufen (Kronen) pro Lektion, 14 Abzeichen.
- Wiederholen (fällige Wörter zuerst), Schnell üben, Wörter-Übersicht mit Suche, Statistik.

## Veröffentlichen (einmalig)

Die App wird kostenlos über **GitHub Pages** ausgeliefert. Bei jedem Hochladen auf GitHub prüft eine automatische Aktion (eine „GitHub Action“) zuerst alle Tests und Inhalte und veröffentlicht erst dann die neue Version.

1. Repository auf GitHub anlegen (öffentlich) und den Code hochladen.
2. Im Repository: **Settings → Pages → Source: „GitHub Actions“**.
3. Nach ein paar Minuten ist die App unter `https://<dein-name>.github.io/<repo-name>/` erreichbar.

## Auf dem iPhone installieren

1. Die Adresse oben in **Safari** öffnen.
2. Unten auf **Teilen** tippen (Quadrat mit Pfeil nach oben).
3. **Zum Home-Bildschirm** wählen, dann **Hinzufügen**.
4. Ab jetzt Pomalo immer über das neue Symbol öffnen. Safari und die App speichern getrennt.

Für die Sprachausgabe brauchst du die kroatische Stimme: **Einstellungen → Bedienungshilfen → Lesen & Sprechen → Stimmen → Kroatisch → Lana** laden.

## Aktualisieren

Jede neue Version, die auf GitHub landet, wird automatisch veröffentlicht. Die App sucht beim Öffnen nach Updates und übernimmt sie, sobald du gerade keine Lektion spielst. Version und Datum stehen unter **Einstellungen → Über Pomalo**.

## Fortschritt sichern

Dein Fortschritt liegt nur auf dem iPhone. Sichere ihn ab und zu:

- **Einstellungen → Als Datei sichern** – zum Beispiel in die Dateien-App oder per AirDrop.
- **Einstellungen → Als Text kopieren** – zum Beispiel in eine Notiz.
- Wiederherstellen mit **Einstellungen → Sicherung laden** (Datei oder Text). Vorher fragt die App nach.

## Neue Einheiten

Neue Einheiten sind einzelne Dateien in `content/units/`. Sag in einer neuen Claude-Sitzung einfach: **„Füge Einheit 7 hinzu“**. Der genaue Ablauf steht in [CLAUDE.md](CLAUDE.md).

## Für Entwickler

```bash
npm install
npm run dev            # Entwicklungsserver
npm run verify         # Typprüfung, Inhaltsprüfung, Tests, Build
npm run test:e2e       # End-to-End-Tests im iPhone-Format
```
