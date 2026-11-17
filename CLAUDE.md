# Pomalo – notes for Claude

Croatian learning PWA for one German-speaking learner (iPhone, GitHub Pages). Full spec: `docs/AUFTRAG.md`. Curriculum: `docs/LEHRPLAN.md`. Progress: `docs/STATUS.md`. Native-speaker review list: `docs/GEGENLESEN.md`.

Talk to the user in German, short, no jargon. Code, file names, commits in English; all UI and docs for the user in German.

## Commands
- `npm run dev` – dev server (Browser pane: `.claude/launch.json` → "dev")
- `npm run check:content` – validates `content/` (schema, IDs, 5–8 words, 10–15 tasks per lesson/stage, tiles, characters)
- `npm test` – unit tests (Vitest)
- `npm run test:e2e` – Playwright, iPhone viewport, built app under `/pomalo/`. WebKit cannot start on this Windows PC (missing DLLs); it runs in CI.
- `npm run verify` – typecheck + content + tests + build
- `npm run icons` – regenerate PNG icons
- Node/Git/gh were installed via winget; in PowerShell refresh PATH first: `$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')`

## Structure
- `content/curriculum.json` – all units (titles must match unit files)
- `content/units/uNN.json` – one file per unit: tips, words, sentences, lessons (+ hand-written `extras`: cloze, fact). Picked up automatically.
- `src/content/` – types, library index, validator
- `src/engine/` – exercise generation (`generate.ts`), grading, Leitner SRS, search
- `src/state/` – state schema (`schemaVersion`), migrations, storage, backup, progress (XP/streak/goal/stages), badges, dates
- `src/app/` – store, hash router, saved lesson session, PWA update logic
- `src/ui/` – screens, exercises, Točka mascot SVG
- `tests/unit`, `tests/e2e`, `.github/workflows/deploy.yml`

## Rules
- IDs of words, sentences, lessons never change (progress depends on them).
- State changes: bump `SCHEMA_VERSION` and add a migration in `src/state/migrate.ts`; never drop old migrations.
- Croatian: standard, ijekavian, Croatian vocabulary (kruh, tjedan, tisuća, tko, kava …); infinitive not da-construction; clitics in 2nd position. Colloquial forms only as marked `colloquial`. When unsure: look it up (Hrvatski jezični portal, Wiktionary), else leave it out and note it in `docs/GEGENLESEN.md`.
- Sentences about the learner with gendered forms: `"hr": { "m": [...], "f": [...] }`.

## Workflow „Einheit hinzufügen“
1. Read `docs/LEHRPLAN.md` and the unit's entry in `content/curriculum.json`; check which words earlier units already teach (`wordOrder`).
2. Write `content/units/uNN.json` (4–6 lessons, 5–8 new words each, tips for new grammar, sentences with all accepted variants both ways, extras for endings).
3. `npm run check:content` until clean.
4. Croatian review: spelling and diacritics, gender, case endings, verb forms, clitic position, ijekavian/Croatian vocabulary, natural family usage. Add doubts to `docs/GEGENLESEN.md`.
5. `npm run verify` (and `npm run test:e2e` if UI changed).
6. Update `docs/LEHRPLAN.md` (status ✅) and `docs/STATUS.md`.
7. Commit and push to `main` – the GitHub Action tests and deploys.
