import type { Library } from '../content/library';
import { hrVariants, type Lesson, type Sentence, type Speaker, type Word } from '../content/types';
import type { Exercise } from './exercises';
import { isTask, needsAudio } from './exercises';
import { foldHr, normalize, toTiles } from './grade';
import { pick, seeded, shuffle, type Rng } from './random';

export interface GenOptions {
  speaker: Speaker;
  /** Sound available (voice present and not muted for this lesson). */
  audio: boolean;
  /** Speaking self-checks enabled. */
  speaking: boolean;
  seed?: number | string;
}

export const MIN_TASKS = 10;
export const MAX_TASKS = 15;

type Slot =
  | 'choice-hd' // HR→DE multiple choice
  | 'choice-dh' // DE→HR multiple choice
  | 'pairs'
  | 'tiles'
  | 'listen-word'
  | 'listen-sent'
  | 'listen-type-word'
  | 'listen-type-sent'
  | 'type-dh-word'
  | 'type-hd-word'
  | 'type-dh-sent'
  | 'type-hd-sent'
  | 'speak'
  | 'extra';

// Learning order per stage: get to know → recognise → match → build → type, listening in between.
const STAGE_SLOTS: Record<number, Slot[]> = {
  1: ['choice-hd', 'choice-dh', 'listen-word', 'pairs', 'extra', 'tiles', 'choice-hd', 'extra', 'tiles', 'listen-sent',
      'type-hd-sent', 'extra', 'type-dh-word', 'speak', 'extra', 'tiles', 'choice-dh', 'type-hd-word'],
  2: ['pairs', 'tiles', 'listen-word', 'choice-dh', 'extra', 'tiles', 'listen-type-word', 'type-hd-sent', 'extra',
      'tiles', 'type-dh-word', 'speak', 'listen-sent', 'extra', 'type-dh-sent', 'extra', 'choice-hd', 'tiles'],
  3: ['type-dh-word', 'listen-type-word', 'tiles', 'extra', 'type-dh-sent', 'listen-type-sent', 'extra',
      'type-hd-sent', 'type-dh-word', 'speak', 'tiles', 'extra', 'listen-type-sent', 'type-dh-sent', 'extra', 'pairs',
      'type-hd-word'],
};

const FALLBACK: Slot[] = ['choice-dh', 'choice-hd', 'type-dh-word', 'type-hd-word', 'tiles', 'pairs'];
const AUDIO_SLOTS = new Set<Slot>(['listen-word', 'listen-sent', 'listen-type-word', 'listen-type-sent', 'speak']);

export function targetTaskCount(lesson: Lesson): number {
  return Math.max(MIN_TASKS, Math.min(MAX_TASKS, 10 + Math.floor(lesson.newWords.length / 2)));
}

/** Text shown for a word in Croatian. */
export function wordHr(w: Word): string {
  return w.hr;
}

export function wordAcceptedHr(w: Word): string[] {
  return [w.hr, ...(w.hrAlt ?? []), ...(w.colloquial ?? []), ...(w.forms ? [w.forms.f, w.forms.n] : [])];
}

export function wordSay(w: Word): string {
  return w.say ?? w.hr;
}

class Builder {
  readonly out: Exercise[] = [];
  private usage = new Map<string, number>();
  private usedSentences = new Map<string, number>();
  private n = 0;
  constructor(
    readonly lib: Library,
    readonly rng: Rng,
    readonly opts: GenOptions,
    /** Words this round trains. */
    readonly words: Word[],
    /** Words that may serve as distractors (already known or in this round). */
    readonly distractorPool: Word[],
    readonly sentences: Sentence[],
    readonly prefix: string,
  ) {}

  nextId(kind: string): string {
    this.n += 1;
    return `${this.prefix}:${this.n}:${kind}`;
  }

  /** Least-used word (random among ties), optionally from a subset. */
  takeWord(from: Word[] = this.words, filter?: (w: Word) => boolean): Word | undefined {
    const c = from.filter((w) => !filter || filter(w));
    if (!c.length) return undefined;
    const min = Math.min(...c.map((w) => this.usage.get(w.id) ?? 0));
    const w = pick(c.filter((x) => (this.usage.get(x.id) ?? 0) === min), this.rng)!;
    this.usage.set(w.id, min + 1);
    return w;
  }

  takeSentence(filter?: (s: Sentence) => boolean): Sentence | undefined {
    const c = this.sentences.filter((s) => !filter || filter(s));
    if (!c.length) return undefined;
    const min = Math.min(...c.map((s) => this.usedSentences.get(s.id) ?? 0));
    if (min >= 2) return undefined;
    const s = pick(c.filter((x) => (this.usedSentences.get(x.id) ?? 0) === min), this.rng)!;
    this.usedSentences.set(s.id, min + 1);
    for (const id of s.words) this.usage.set(id, (this.usage.get(id) ?? 0) + 1);
    return s;
  }

  hr(s: Sentence): string[] {
    return hrVariants(s.hr, this.opts.speaker);
  }

  distractorWords(target: Word, n: number, sameKey: (w: Word) => string): Word[] {
    const key = sameKey(target);
    const tf = foldHr(normalize(target.hr));
    const seen = new Set<string>([key]);
    const cands = shuffle(
      this.distractorPool.filter((w) => w.id !== target.id && foldHr(normalize(w.hr)) !== tf),
      this.rng,
    ).sort((a, b) => Number(b.pos === target.pos) - Number(a.pos === target.pos));
    const res: Word[] = [];
    for (const w of cands) {
      const k = sameKey(w);
      if (seen.has(k) || w.de.some((d) => target.de.includes(d))) continue;
      seen.add(k);
      res.push(w);
      if (res.length === n) break;
    }
    return res;
  }

  choice(dir: 'hr-de' | 'de-hr'): Exercise | null {
    const w = this.takeWord();
    if (!w) return null;
    const key = dir === 'hr-de' ? (x: Word) => x.de[0]! : (x: Word) => foldHr(normalize(x.hr));
    const ds = this.distractorWords(w, 3, key);
    if (ds.length < 2) return null;
    const label = (x: Word) => (dir === 'hr-de' ? x.de[0]! : wordHr(x));
    return {
      kind: 'choice',
      id: this.nextId('choice'),
      dir,
      prompt: dir === 'hr-de' ? wordHr(w) : w.de[0]!,
      answer: label(w),
      options: shuffle([w, ...ds].map(label), this.rng),
      audio: dir === 'hr-de' ? wordSay(w) : undefined,
      wordIds: [w.id],
    };
  }

  pairs(): Exercise | null {
    const chosen: Word[] = [];
    const seenHr = new Set<string>();
    const seenDe = new Set<string>();
    const add = (w: Word) => {
      const h = foldHr(normalize(w.hr));
      if (seenHr.has(h) || w.de.some((d) => seenDe.has(d)) || chosen.length >= 5) return;
      seenHr.add(h);
      w.de.forEach((d) => seenDe.add(d));
      chosen.push(w);
    };
    shuffle(this.words, this.rng).forEach(add);
    shuffle(this.distractorPool, this.rng).forEach(add);
    if (chosen.length < 4) return null;
    for (const w of chosen) this.usage.set(w.id, (this.usage.get(w.id) ?? 0) + 1);
    const own = new Set(this.words.map((w) => w.id));
    return {
      kind: 'pairs',
      id: this.nextId('pairs'),
      pairs: chosen.map((w) => ({ wordId: w.id, hr: wordHr(w), de: w.de[0]!, say: wordSay(w) })),
      wordIds: chosen.filter((w) => own.has(w.id)).map((w) => w.id),
    };
  }

  tiles(): Exercise | null {
    const s = this.takeSentence((x) => toTiles(this.hr(x)[0]!).length >= 2);
    if (!s) return null;
    const variants = this.hr(s);
    // Lower-case the first tile (unless it is a name), so capitals do not give the order away.
    const target = toTiles(variants[0]!).map((t, i) => (i === 0 && !this.lib.properNouns.has(t) ? t.toLowerCase() : t));
    const lower = new Set(target.map((t) => t.toLowerCase()));
    let extra = (s.distractors ?? []).filter((d) => !lower.has(d.toLowerCase()));
    if (extra.length < 2) {
      const more = shuffle(this.distractorPool, this.rng)
        .map((w) => w.hr)
        .filter((h) => !h.includes(' ') && !lower.has(h.toLowerCase()) && !extra.includes(h));
      extra = [...extra, ...more].slice(0, 3);
    }
    return {
      kind: 'tiles',
      id: this.nextId('tiles'),
      prompt: s.de[0]!,
      tiles: shuffle([...target, ...extra.slice(0, 3)], this.rng),
      accepted: variants,
      wordIds: s.words,
    };
  }

  listenWord(mode: 'choice' | 'type'): Exercise | null {
    const w = this.takeWord();
    if (!w) return null;
    if (mode === 'type') {
      return { kind: 'listen', id: this.nextId('listen'), mode, audio: wordSay(w), accepted: [w.hr, ...(w.hrAlt ?? [])], de: w.de[0]!, wordIds: [w.id] };
    }
    const ds = this.distractorWords(w, 3, (x) => foldHr(normalize(x.hr)));
    if (ds.length < 2) return null;
    return {
      kind: 'listen',
      id: this.nextId('listen'),
      mode,
      audio: wordSay(w),
      options: shuffle([w, ...ds].map(wordHr), this.rng),
      accepted: [w.hr],
      de: w.de[0]!,
      wordIds: [w.id],
    };
  }

  listenSentence(mode: 'choice' | 'type'): Exercise | null {
    const s = this.takeSentence();
    if (!s) return null;
    const v = this.hr(s);
    if (mode === 'type') {
      return { kind: 'listen', id: this.nextId('listen'), mode, audio: v[0]!, accepted: v, de: s.de[0]!, wordIds: s.words };
    }
    const others = shuffle(
      this.sentences.filter((x) => x.id !== s.id).map((x) => this.hr(x)[0]!),
      this.rng,
    ).filter((x) => foldHr(normalize(x)) !== foldHr(normalize(v[0]!)));
    if (others.length < 2) return null;
    return {
      kind: 'listen',
      id: this.nextId('listen'),
      mode,
      audio: v[0]!,
      options: shuffle([v[0]!, ...others.slice(0, 2)], this.rng),
      accepted: [v[0]!],
      de: s.de[0]!,
      wordIds: s.words,
    };
  }

  typeWord(dir: 'hr-de' | 'de-hr'): Exercise | null {
    const w = this.takeWord();
    if (!w) return null;
    return dir === 'de-hr'
      ? { kind: 'translate', id: this.nextId('type'), dir, prompt: w.de[0]!, accepted: wordAcceptedHr(w), wordIds: [w.id], hint: w.pos === 'verb' ? 'Grundform' : undefined }
      : { kind: 'translate', id: this.nextId('type'), dir, prompt: wordHr(w), accepted: w.de, audio: wordSay(w), wordIds: [w.id] };
  }

  typeSentence(dir: 'hr-de' | 'de-hr'): Exercise | null {
    const s = this.takeSentence();
    if (!s) return null;
    const v = this.hr(s);
    return dir === 'de-hr'
      ? { kind: 'translate', id: this.nextId('type'), dir, prompt: s.de[0]!, accepted: v, wordIds: s.words }
      : { kind: 'translate', id: this.nextId('type'), dir, prompt: v[0]!, accepted: s.de, audio: v[0], wordIds: s.words };
  }

  speak(): Exercise | null {
    const s = this.takeSentence();
    if (s) return { kind: 'speak', id: this.nextId('speak'), hr: this.hr(s)[0]!, de: s.de[0]!, wordIds: s.words };
    const w = this.takeWord();
    return w ? { kind: 'speak', id: this.nextId('speak'), hr: wordSay(w), de: w.de[0]!, wordIds: [w.id] } : null;
  }

  slot(slot: Slot): Exercise | null {
    switch (slot) {
      case 'choice-hd': return this.choice('hr-de');
      case 'choice-dh': return this.choice('de-hr');
      case 'pairs': return this.pairs();
      case 'tiles': return this.tiles();
      case 'listen-word': return this.listenWord('choice');
      case 'listen-sent': return this.listenSentence('choice');
      case 'listen-type-word': return this.listenWord('type');
      case 'listen-type-sent': return this.listenSentence('type');
      case 'type-dh-word': return this.typeWord('de-hr');
      case 'type-hd-word': return this.typeWord('hr-de');
      case 'type-dh-sent': return this.typeSentence('de-hr');
      case 'type-hd-sent': return this.typeSentence('hr-de');
      case 'speak': return this.speak();
      case 'extra': return null;
    }
  }

  push(e: Exercise | null): boolean {
    if (!e) return false;
    if (!this.opts.audio && needsAudio(e)) return false;
    if (!this.opts.speaking && e.kind === 'speak') return false;
    this.out.push(e);
    return true;
  }
}

function slotAllowed(slot: Slot, opts: GenOptions): boolean {
  if (slot === 'speak') return opts.audio && opts.speaking;
  return opts.audio || !AUDIO_SLOTS.has(slot);
}

/** Words known before a lesson (for distractors). */
function wordsBefore(lib: Library, lessonId: string): Word[] {
  const res: Word[] = [];
  for (const l of lib.lessons) {
    if (l.id === lessonId) break;
    for (const id of l.newWords) {
      const w = lib.words.get(id);
      if (w) res.push(w);
    }
  }
  return res;
}

function extraToExercise(lesson: Lesson, idx: number, prefix: string, rng: Rng): Exercise | null {
  const e = lesson.extras?.[idx];
  if (!e) return null;
  if (e.type === 'cloze') {
    return {
      kind: 'cloze',
      id: `${prefix}:x:${e.id}`,
      hr: e.hr,
      de: e.de,
      answers: e.answers,
      options: e.options ? shuffle(e.options, rng) : undefined,
      hint: e.hint,
      wordIds: [],
    };
  }
  return {
    kind: 'fact',
    id: `${prefix}:x:${e.id}`,
    question: e.question,
    options: shuffle(e.options, rng),
    answer: e.answer,
    audio: e.audio,
    explain: e.explain,
    wordIds: [],
  };
}

export function generateLesson(lib: Library, lessonId: string, stage: number, opts: GenOptions): Exercise[] {
  const lesson = lib.lessonById.get(lessonId);
  if (!lesson) throw new Error(`Unknown lesson ${lessonId}`);
  const rng = seeded(opts.seed ?? `${lessonId}:${stage}:${Date.now()}`);
  const words = lesson.newWords.map((id) => lib.words.get(id)).filter((w): w is Word => !!w);
  const sentences = lesson.sentences.map((id) => lib.sentences.get(id)).filter((s): s is Sentence => !!s);
  const before = wordsBefore(lib, lessonId);
  const b = new Builder(lib, rng, opts, words, [...words, ...before], sentences, `${lessonId}:${stage}`);
  const target = targetTaskCount(lesson);
  const extrasCount = lesson.extras?.length ?? 0;
  let extraIdx = 0;

  // Stage 1 introduces words in two halves, each followed by a quick recognition task.
  const half = Math.ceil(words.length / 2);
  const firstHalf = words.slice(0, half);
  const intro = (ws: Word[]) => ws.forEach((w) => b.out.push({ kind: 'intro', id: b.nextId('intro'), wordId: w.id, wordIds: [w.id] }));

  const tasks = () => b.out.filter(isTask).length;
  const slots = [...(STAGE_SLOTS[stage] ?? STAGE_SLOTS[3]!)];

  if (stage === 1) {
    intro(firstHalf);
    const sub = new Builder(lib, rng, opts, firstHalf, [...words, ...before], [], `${lessonId}:${stage}:a`);
    b.push(sub.choice('hr-de'));
    intro(words.slice(half));
    slots.shift();
  }

  for (const slot of slots) {
    if (tasks() >= target) break;
    if (slot === 'extra') {
      if (extraIdx < extrasCount) b.push(extraToExercise(lesson, extraIdx++, b.prefix, rng));
      continue;
    }
    // Keep room for the remaining hand-written tasks.
    if (tasks() + (extrasCount - extraIdx) >= target) continue;
    if (!slotAllowed(slot, opts)) continue;
    b.push(b.slot(slot));
  }
  // Hand-written tasks that did not get a slot yet.
  while (extraIdx < extrasCount && tasks() < MAX_TASKS) b.push(extraToExercise(lesson, extraIdx++, b.prefix, rng));
  // Fill up with simple tasks if the lesson is short on sentences.
  for (let guard = 0; tasks() < target && guard < 40; guard++) {
    b.push(b.slot(FALLBACK[guard % FALLBACK.length]!));
  }
  return b.out;
}

/** Review: due words first, then weak ones. */
export function generateReview(lib: Library, wordIds: string[], boxes: Record<string, number>, opts: GenOptions, count = 12): Exercise[] {
  const rng = seeded(opts.seed ?? `review:${Date.now()}`);
  const words = wordIds.map((id) => lib.words.get(id)).filter((w): w is Word => !!w);
  const known = new Set(Object.keys(boxes));
  const pool = lib.wordOrder.filter((id) => known.has(id)).map((id) => lib.words.get(id)!).filter(Boolean);
  const target = new Set(wordIds);
  const sentences = [...lib.sentences.values()].filter(
    (s) => s.words.length > 0 && s.words.every((id) => known.has(id)) && s.words.some((id) => target.has(id)),
  );
  const b = new Builder(lib, rng, opts, words, pool.length >= 4 ? pool : words, sentences, 'review');
  for (const w of shuffle(words, rng)) {
    if (b.out.length >= count) break;
    const box = boxes[w.id] ?? 1;
    const order: Slot[] = box <= 2 ? ['choice-dh', 'listen-word', 'choice-hd'] : ['type-dh-word', 'listen-type-word', 'type-hd-word'];
    const options = order.filter((s) => slotAllowed(s, opts));
    const slot = options[Math.floor(rng() * options.length)] ?? 'choice-dh';
    const single = new Builder(lib, rng, opts, [w], b.distractorPool, [], `review:${w.id}`);
    b.push(single.slot(slot));
    if (b.out.length % 4 === 3) b.push(b.tiles());
  }
  for (let guard = 0; b.out.length < Math.min(count, 10) && guard < 20; guard++) b.push(b.slot(FALLBACK[guard % FALLBACK.length]!));
  return shuffle(b.out.slice(0, 15), rng);
}

/** Quick practice: fast task types only. */
export function generateQuick(lib: Library, wordIds: string[], opts: GenOptions, count = 7): Exercise[] {
  const rng = seeded(opts.seed ?? `quick:${Date.now()}`);
  const words = wordIds.map((id) => lib.words.get(id)).filter((w): w is Word => !!w);
  const b = new Builder(lib, rng, opts, words, words, [], 'quick');
  const slots: Slot[] = ['choice-dh', 'choice-hd', 'listen-word', 'pairs', 'choice-dh', 'listen-word', 'choice-hd', 'choice-dh'];
  for (const s of slots) {
    if (b.out.length >= count) break;
    if (slotAllowed(s, opts)) b.push(b.slot(s));
  }
  for (let guard = 0; b.out.length < 6 && guard < 10; guard++) b.push(b.slot(guard % 2 ? 'choice-hd' : 'choice-dh'));
  return b.out;
}

/** Replace sound-dependent tasks when the user switches sound off mid-lesson. */
export function withoutAudio(e: Exercise): Exercise | null {
  if (e.kind === 'speak') return null;
  if (e.kind !== 'listen') return e;
  if (e.mode === 'choice' && e.options) {
    return { kind: 'choice', id: e.id + ':na', dir: 'de-hr', prompt: e.de, options: e.options, answer: e.accepted[0]!, wordIds: e.wordIds };
  }
  return { kind: 'translate', id: e.id + ':na', dir: 'de-hr', prompt: e.de, accepted: e.accepted, wordIds: e.wordIds };
}
