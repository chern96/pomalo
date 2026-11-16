import { describe, expect, it } from 'vitest';
import { validateContent } from '../../src/content/validate';
import { isTask, type Exercise } from '../../src/engine/exercises';
import { generateLesson, generateQuick, generateReview, withoutAudio } from '../../src/engine/generate';
import { matchesWord } from '../../src/engine/search';
import { readCurriculum, readUnits, realLibrary } from './helpers';

const lib = realLibrary();

describe('content check', () => {
  it('all content files are valid', () => {
    expect(validateContent(readCurriculum(), readUnits())).toEqual([]);
  });

  it('finds broken content', () => {
    const units = readUnits().map((u) => structuredClone(u));
    const u = units[0]!.data;
    delete u.words[0]!.gender; // noun without gender
    u.words[1]!.hr = 'тата'; // Cyrillic
    u.sentences[0]!.distractors = ['hvala']; // distractor that is part of the sentence
    u.lessons[0]!.newWords = u.lessons[0]!.newWords.slice(0, 3); // too few words
    u.words.push({ ...u.words[2]!, id: u.words[3]!.id }); // duplicate id
    const errors = validateContent(readCurriculum(), units).join('\n');
    expect(errors).toMatch(/Nomen ohne Geschlecht/);
    expect(errors).toMatch(/unerwartete Zeichen/);
    expect(errors).toMatch(/Ablenk-Baustein/);
    expect(errors).toMatch(/neue Wörter \(erlaubt 5–8\)/);
    expect(errors).toMatch(/doppelt/);
  });

  it('finds sentences that use words before they are taught', () => {
    const units = readUnits().map((u) => structuredClone(u));
    units[0]!.data.lessons[0]!.sentences.push('s-otac-i-sin');
    expect(validateContent(readCurriculum(), units).join('\n')).toMatch(/erst später/);
  });
});

describe('lesson generation', () => {
  const opts = { speaker: 'm' as const, audio: true, speaking: true };

  it('builds 10–15 tasks for every lesson and stage', () => {
    for (const l of lib.lessons) {
      for (const stage of [1, 2, 3]) {
        const n = generateLesson(lib, l.id, stage, { ...opts, seed: 7 }).filter(isTask).length;
        expect(n, `${l.id} stage ${stage}`).toBeGreaterThanOrEqual(10);
        expect(n, `${l.id} stage ${stage}`).toBeLessThanOrEqual(15);
      }
    }
  });

  it('introduces every new word in stage 1, before it is asked', () => {
    const l = lib.lessons[0]!;
    const ex = generateLesson(lib, l.id, 1, { ...opts, seed: 1 });
    const introduced = new Set<string>();
    for (const e of ex) {
      if (e.kind === 'intro') introduced.add(e.wordId);
      else if (e.kind === 'choice' || e.kind === 'translate') {
        for (const w of e.wordIds) if (l.newWords.includes(w)) expect(introduced.has(w), `${w} asked before intro`).toBe(true);
      }
    }
    expect(introduced.size).toBe(l.newWords.length);
  });

  it('later stages use more typing and fewer choices', () => {
    const count = (ex: Exercise[], kinds: string[]) => ex.filter((e) => kinds.includes(e.kind)).length;
    let s1 = 0;
    let s3 = 0;
    for (const l of lib.lessons) {
      s1 += count(generateLesson(lib, l.id, 1, { ...opts, seed: 3 }), ['translate', 'listen']);
      s3 += count(generateLesson(lib, l.id, 3, { ...opts, seed: 3 }), ['translate', 'listen']);
    }
    expect(s3).toBeGreaterThan(s1);
  });

  it('includes all hand-written tasks', () => {
    for (const l of lib.lessons) {
      const ex = generateLesson(lib, l.id, 1, { ...opts, seed: 5 });
      for (const x of l.extras ?? []) expect(ex.some((e) => e.id.endsWith(`:x:${x.id}`)), `${l.id}/${x.id}`).toBe(true);
    }
  });

  it('has no sound tasks when there is no sound', () => {
    for (const l of lib.lessons) {
      const ex = generateLesson(lib, l.id, 2, { ...opts, audio: false, seed: 2 });
      expect(ex.some((e) => e.kind === 'listen' || e.kind === 'speak')).toBe(false);
    }
  });

  it('turns listening tasks into reading tasks when sound is switched off', () => {
    const listen: Exercise = { kind: 'listen', id: 'x', mode: 'type', audio: 'voda', accepted: ['voda'], de: 'Wasser', wordIds: ['w-voda'] };
    expect(withoutAudio(listen)).toMatchObject({ kind: 'translate', dir: 'de-hr', prompt: 'Wasser' });
    expect(withoutAudio({ kind: 'speak', id: 's', hr: 'voda', de: 'Wasser', wordIds: [] })).toBeNull();
  });

  it('uses the chosen first-person form for sentences about me', () => {
    const lessonWithForms = lib.lessons.find((l) => l.sentences.some((id) => !Array.isArray(lib.sentences.get(id)!.hr)));
    if (!lessonWithForms) return; // only from unit 3 on
    const s = lessonWithForms.sentences.map((id) => lib.sentences.get(id)!).find((x) => !Array.isArray(x.hr))!;
    const forms = s.hr as { m: string[]; f: string[] };
    for (const speaker of ['m', 'f'] as const) {
      for (let seed = 0; seed < 20; seed++) {
        const ex = generateLesson(lib, lessonWithForms.id, 2, { ...opts, speaker, seed });
        for (const e of ex) {
          if (e.kind === 'tiles' && e.wordIds === s.words) expect(e.accepted).toEqual(forms[speaker]);
        }
      }
    }
  });

  it('review and quick practice work with learned words', () => {
    const ids = lib.lessons.slice(0, 2).flatMap((l) => l.newWords);
    const boxes = Object.fromEntries(ids.map((id) => [id, 1]));
    const r = generateReview(lib, ids.slice(0, 12), boxes, { ...opts, seed: 1 });
    expect(r.length).toBeGreaterThanOrEqual(10);
    expect(r.length).toBeLessThanOrEqual(15);
    const q = generateQuick(lib, ids, { ...opts, seed: 1 });
    expect(q.length).toBeGreaterThanOrEqual(6);
    expect(q.length).toBeLessThanOrEqual(8);
    expect(q.every((e) => ['choice', 'pairs', 'listen'].includes(e.kind))).toBe(true);
  });
});

describe('word search', () => {
  it('finds words without special characters', () => {
    const w = lib.words.get('w-secer')!;
    expect(matchesWord(w, 'secer')).toBe(true);
    expect(matchesWord(w, 'Zucker')).toBe(true);
    expect(matchesWord(w, 'Brot')).toBe(false);
  });
});
