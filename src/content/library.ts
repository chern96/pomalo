import type { Curriculum, CurriculumUnit, Lesson, Sentence, Tip, Unit, Word } from './types';
import { allHrVariants } from './types';

/** Indexed view over all content. Pure: usable from the app, tests and scripts. */
export interface Library {
  curriculum: Curriculum;
  units: Unit[];
  unitById: Map<string, Unit>;
  /** All lessons of ready units, in learning order. */
  lessons: Lesson[];
  lessonById: Map<string, Lesson>;
  unitOfLesson: Map<string, Unit>;
  words: Map<string, Word>;
  sentences: Map<string, Sentence>;
  tips: Map<string, Tip>;
  /** Lowercased Croatian surface forms known anywhere in the content. */
  knownForms: Set<string>;
  /** Word ids in the order they are introduced. */
  wordOrder: string[];
  /** Tokens that are always capitalised (names, countries, Vi). */
  properNouns: Set<string>;
  /** Curriculum entries, with the matching unit if it has content. */
  path: { entry: CurriculumUnit; unit?: Unit }[];
}

export function buildLibrary(curriculum: Curriculum, units: Unit[]): Library {
  const sorted = [...units].sort((a, b) => a.number - b.number);
  const unitById = new Map(sorted.map((u) => [u.id, u]));
  const lessons: Lesson[] = [];
  const lessonById = new Map<string, Lesson>();
  const unitOfLesson = new Map<string, Unit>();
  const words = new Map<string, Word>();
  const sentences = new Map<string, Sentence>();
  const tips = new Map<string, Tip>();
  const knownForms = new Set<string>();
  const wordOrder: string[] = [];

  const properNouns = new Set<string>();
  const addForms = (text: string) => {
    const toks = text.split(/[\s.,!?;:„“"()…–-]+/).filter(Boolean);
    toks.forEach((tok, i) => {
      knownForms.add(tok.toLowerCase());
      // Capitalised in the middle of a sentence → a name.
      if (i > 0 && tok[0] !== tok[0]!.toLowerCase()) properNouns.add(tok);
    });
  };

  for (const u of sorted) {
    for (const w of u.words) {
      words.set(w.id, w);
      if (w.hr[0] !== w.hr[0]!.toLowerCase()) properNouns.add(w.hr);
      addForms(w.hr);
      w.hrAlt?.forEach(addForms);
      w.colloquial?.forEach(addForms);
      if (w.present) addForms(w.present);
      if (w.forms) Object.values(w.forms).forEach(addForms);
      addForms(w.example.hr);
    }
    for (const s of u.sentences) {
      sentences.set(s.id, s);
      allHrVariants(s.hr).forEach(addForms);
    }
    for (const t of u.tips) {
      tips.set(t.id, t);
      t.examples.forEach(([hr]) => addForms(hr));
    }
    for (const l of u.lessons) {
      lessons.push(l);
      lessonById.set(l.id, l);
      unitOfLesson.set(l.id, u);
      wordOrder.push(...l.newWords);
      for (const e of l.extras ?? []) if (e.type === 'cloze') e.answers.forEach(addForms);
    }
  }

  const path = [...curriculum.units]
    .sort((a, b) => a.number - b.number)
    .map((entry) => ({ entry, unit: unitById.get(entry.id) }));

  return {
    curriculum,
    units: sorted,
    unitById,
    lessons,
    lessonById,
    unitOfLesson,
    words,
    sentences,
    tips,
    knownForms,
    wordOrder,
    properNouns,
    path,
  };
}
