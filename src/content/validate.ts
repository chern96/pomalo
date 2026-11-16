import { z } from 'zod';
import { buildLibrary } from './library';
import { allHrVariants, type Curriculum, type Unit } from './types';
import { generateLesson, MAX_TASKS, MIN_TASKS } from '../engine/generate';
import { isTask } from '../engine/exercises';
import { normalize, toTiles } from '../engine/grade';

const id = z.string().regex(/^[a-z0-9-]+$/, 'IDs: nur a-z, 0-9 und -');
const hrText = z.string().min(1);
const example = z.object({ hr: hrText, de: z.string().min(1) }).strict();

const word = z
  .object({
    id,
    hr: hrText,
    de: z.array(z.string().min(1)).min(1),
    pos: z.enum(['noun', 'verb', 'adj', 'adv', 'pron', 'num', 'phrase', 'particle', 'prep', 'conj', 'letter']),
    gender: z.enum(['m', 'f', 'n']).optional(),
    pluralOnly: z.boolean().optional(),
    present: hrText.optional(),
    forms: z.object({ m: hrText, f: hrText, n: hrText }).strict().optional(),
    hrAlt: z.array(hrText).optional(),
    colloquial: z.array(hrText).optional(),
    isColloquial: z.boolean().optional(),
    formal: z.boolean().optional(),
    note: z.string().optional(),
    example,
    say: hrText.optional(),
  })
  .strict();

const hrVariantsSchema = z.union([
  z.array(hrText).min(1),
  z.object({ m: z.array(hrText).min(1), f: z.array(hrText).min(1) }).strict(),
]);

const sentence = z
  .object({
    id,
    hr: hrVariantsSchema,
    de: z.array(z.string().min(1)).min(1),
    words: z.array(id),
    distractors: z.array(hrText).optional(),
    formal: z.boolean().optional(),
    colloquial: z.boolean().optional(),
    note: z.string().optional(),
  })
  .strict();

const tip = z
  .object({ id, title: z.string().min(1), text: z.string().min(1), examples: z.array(z.tuple([hrText, z.string()])).min(1) })
  .strict();

const extra = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('cloze'),
      id,
      hr: hrText,
      de: z.string().min(1),
      answers: z.array(hrText).min(1),
      options: z.array(hrText).min(2).optional(),
      hint: z.string().optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal('fact'),
      id,
      question: z.string().min(1),
      options: z.array(z.string().min(1)).min(2),
      answer: z.string().min(1),
      audio: hrText.optional(),
      explain: z.string().optional(),
    })
    .strict(),
]);

const lesson = z
  .object({
    id,
    title: z.string().min(1),
    tip: id.optional(),
    newWords: z.array(id),
    sentences: z.array(id),
    extras: z.array(extra).optional(),
  })
  .strict();

export const unitSchema = z
  .object({
    id: z.string().regex(/^u\d{2}$/),
    number: z.number().int().positive(),
    title: z.string().min(1),
    grammar: z.string().min(1),
    tips: z.array(tip),
    words: z.array(word),
    sentences: z.array(sentence),
    lessons: z.array(lesson).min(4).max(6),
  })
  .strict();

export const curriculumSchema = z
  .object({
    units: z.array(
      z
        .object({
          id: z.string().regex(/^u\d{2}$/),
          number: z.number().int().positive(),
          title: z.string().min(1),
          grammar: z.string().min(1),
          lessons: z.array(z.string().min(1)).min(1),
        })
        .strict(),
    ),
  })
  .strict();

/** Croatian Latin letters only (no q, w, x, y; no Cyrillic; no foreign accents). */
const HR_ALLOWED = /^[A-PR-VZa-pr-vzČĆŠŽĐčćšžđ0-9 .,!?;:'’()„“…–\-/_]*$/;

export interface FileInput {
  name: string;
  data: unknown;
}

export function validateContent(curriculumData: unknown, files: FileInput[]): string[] {
  const errors: string[] = [];
  const err = (where: string, msg: string) => errors.push(`${where}: ${msg}`);

  const cur = curriculumSchema.safeParse(curriculumData);
  if (!cur.success) {
    cur.error.issues.forEach((i) => err('curriculum.json', `${i.path.join('.')} – ${i.message}`));
    return errors;
  }
  const units: Unit[] = [];
  for (const f of files) {
    const r = unitSchema.safeParse(f.data);
    if (!r.success) r.error.issues.forEach((i) => err(f.name, `${i.path.join('.')} – ${i.message}`));
    else units.push(r.data as Unit);
  }
  if (errors.length) return errors;

  const curriculum = cur.data as Curriculum;
  const curById = new Map(curriculum.units.map((u) => [u.id, u]));
  const numbers = new Set<number>();
  for (const u of curriculum.units) {
    if (numbers.has(u.number)) err('curriculum.json', `Nummer ${u.number} doppelt`);
    numbers.add(u.number);
  }

  // Globally unique IDs
  const seen = new Map<string, string>();
  const claim = (key: string, where: string) => {
    if (seen.has(key)) err(where, `ID ${key} doppelt (schon in ${seen.get(key)})`);
    else seen.set(key, where);
  };
  for (const u of units) {
    claim(`unit:${u.id}`, u.id);
    u.words.forEach((w) => claim(w.id, u.id));
    u.sentences.forEach((s) => claim(s.id, u.id));
    u.tips.forEach((t) => claim(t.id, u.id));
    u.lessons.forEach((l) => {
      claim(l.id, u.id);
      l.extras?.forEach((e) => claim(e.id, u.id));
    });
  }

  const checkHr = (where: string, text: string) => {
    if (!HR_ALLOWED.test(text)) {
      const bad = [...text].filter((c) => !HR_ALLOWED.test(c));
      err(where, `unerwartete Zeichen ${JSON.stringify(bad.join(''))} in „${text}“`);
    }
  };

  const lib = buildLibrary(curriculum, units);
  const introducedAt = new Map<string, number>();
  lib.lessons.forEach((l, i) => l.newWords.forEach((w) => {
    if (introducedAt.has(w)) err(l.id, `Wort ${w} wird zweimal eingeführt`);
    introducedAt.set(w, i);
  }));

  for (const u of units) {
    const c = curById.get(u.id);
    if (!c) err(u.id, 'fehlt in curriculum.json');
    else {
      if (c.number !== u.number) err(u.id, `Nummer ${u.number} ≠ Lehrplan ${c.number}`);
      if (c.title !== u.title) err(u.id, `Titel „${u.title}“ ≠ Lehrplan „${c.title}“`);
      const titles = u.lessons.map((l) => l.title);
      if (titles.join('|') !== c.lessons.join('|')) err(u.id, 'Lektionstitel weichen vom Lehrplan ab');
    }
    const tipIds = new Set(u.tips.map((t) => t.id));
    const ownWords = new Set(u.words.map((w) => w.id));

    for (const w of u.words) {
      const at = `${u.id}/${w.id}`;
      if (!introducedAt.has(w.id)) err(at, 'wird in keiner Lektion eingeführt');
      if (w.pos === 'noun' && !w.gender) err(at, 'Nomen ohne Geschlecht');
      if (w.pos === 'verb' && !w.present) err(at, 'Verb ohne Präsensform');
      if (w.pos === 'adj' && !w.forms) err(at, 'Adjektiv ohne Formen m/f/n');
      if (w.forms && w.forms.m !== w.hr) err(at, 'forms.m muss gleich hr sein');
      [w.hr, w.present, w.example.hr, w.say, ...(w.hrAlt ?? []), ...(w.colloquial ?? []), ...(w.forms ? Object.values(w.forms) : [])]
        .filter((x): x is string => !!x)
        .forEach((x) => checkHr(at, x));
    }
    for (const t of u.tips) t.examples.forEach(([hr]) => checkHr(`${u.id}/${t.id}`, hr.replace(/→/g, '')));

    for (const s of u.sentences) {
      const at = `${u.id}/${s.id}`;
      allHrVariants(s.hr).forEach((v) => {
        checkHr(at, v);
        const tiles = toTiles(v);
        if (normalize(tiles.join(' ')) !== normalize(v)) err(at, `Bausteine ergeben nicht den Satz „${v}“`);
      });
      const canon = Array.isArray(s.hr) ? [s.hr[0]!] : [s.hr.m[0]!, s.hr.f[0]!];
      for (const c of canon) {
        const lower = new Set(toTiles(c).map((t) => t.toLowerCase()));
        for (const d of s.distractors ?? []) {
          checkHr(at, d);
          if (lower.has(d.toLowerCase())) err(at, `Ablenk-Baustein „${d}“ steckt im Zielsatz`);
        }
      }
      for (const wid of s.words) if (!lib.words.has(wid)) err(at, `unbekanntes Wort ${wid}`);
    }

    for (const l of u.lessons) {
      const at = `${u.id}/${l.id}`;
      const idx = lib.lessons.indexOf(l);
      if (l.newWords.length < 5 || l.newWords.length > 8) err(at, `${l.newWords.length} neue Wörter (erlaubt 5–8)`);
      if (l.tip && !tipIds.has(l.tip)) err(at, `Tipp ${l.tip} fehlt in der Einheit`);
      for (const w of l.newWords) if (!ownWords.has(w)) err(at, `neues Wort ${w} gehört nicht zu ${u.id}`);
      for (const sid of l.sentences) {
        const s = lib.sentences.get(sid);
        if (!s) {
          err(at, `unbekannter Satz ${sid}`);
          continue;
        }
        for (const wid of s.words) {
          const i = introducedAt.get(wid);
          if (i === undefined || i > idx) err(at, `Satz ${sid} nutzt Wort ${wid}, das erst später kommt`);
        }
      }
      for (const e of l.extras ?? []) {
        const ea = `${at}/${e.id}`;
        if (e.type === 'cloze') {
          if (e.hr.split('___').length !== 2) err(ea, 'Lückentext braucht genau eine Lücke ___');
          checkHr(ea, e.hr.replace(/\(.*?\)/g, ''));
          e.answers.forEach((a) => checkHr(ea, a));
          if (e.options && !e.answers.some((a) => e.options!.includes(a))) err(ea, 'keine Antwort unter den Optionen');
          if (e.options && new Set(e.options).size !== e.options.length) err(ea, 'doppelte Optionen');
        } else {
          if (!e.options.includes(e.answer)) err(ea, 'Antwort nicht unter den Optionen');
          if (e.audio) checkHr(ea, e.audio);
        }
      }
      // Generated lessons must have 10–15 tasks in every stage and sound setting.
      for (const stage of [1, 2, 3]) {
        for (const audio of [true, false]) {
          for (const speaker of ['m', 'f'] as const) {
            for (const seed of [1, 2, 3]) {
              const ex = generateLesson(lib, l.id, stage, { speaker, audio, speaking: true, seed: `${l.id}-${seed}` });
              const n = ex.filter(isTask).length;
              if (n < MIN_TASKS || n > MAX_TASKS) {
                err(at, `Stufe ${stage}${audio ? '' : ' ohne Ton'}: ${n} Aufgaben (erlaubt ${MIN_TASKS}–${MAX_TASKS})`);
              }
              if (stage === 1 && ex.filter((e) => e.kind === 'intro').length !== l.newWords.length) {
                err(at, 'Stufe 1 führt nicht alle neuen Wörter ein');
              }
            }
          }
        }
      }
    }
  }
  return [...new Set(errors)];
}
