// Content format. One JSON file per unit in content/units/. IDs are stable forever.

export type Gender = 'm' | 'f' | 'n';
export type Speaker = 'm' | 'f';
export type Pos =
  | 'noun'
  | 'verb'
  | 'adj'
  | 'adv'
  | 'pron'
  | 'num'
  | 'phrase'
  | 'particle'
  | 'prep'
  | 'conj'
  | 'letter';

export interface Example {
  hr: string;
  de: string;
}

export interface Word {
  id: string;
  /** Canonical Croatian form (for adjectives: masculine). */
  hr: string;
  /** German meanings; first one is shown. */
  de: string[];
  pos: Pos;
  /** Required for nouns. */
  gender?: Gender;
  /** Noun used only in plural (roditelji, djeca). */
  pluralOnly?: boolean;
  /** Required for verbs: 1st person singular present (govorim). */
  present?: string;
  /** Required for adjectives. */
  forms?: { m: string; f: string; n: string };
  /** Other accepted Croatian spellings/forms when typing. */
  hrAlt?: string[];
  /** Colloquial variants used by family and friends (shown, accepted). */
  colloquial?: string[];
  /** This word itself is colloquial. */
  isColloquial?: boolean;
  /** Formal "Vi" register. */
  formal?: boolean;
  note?: string;
  example: Example;
  /** Text to speak instead of hr (e.g. for letters). */
  say?: string;
}

/** Either one list of variants, or separate lists for a male / female speaker. */
export type HrVariants = string[] | { m: string[]; f: string[] };

export interface Sentence {
  id: string;
  hr: HrVariants;
  de: string[];
  /** Word ids used in this sentence (for repetition). */
  words: string[];
  /** Extra wrong tiles for sentence building. */
  distractors?: string[];
  formal?: boolean;
  colloquial?: boolean;
  note?: string;
}

export interface Tip {
  id: string;
  title: string;
  text: string;
  examples: [string, string][];
}

/** Hand-written tasks that cannot be derived from words and sentences. */
export type Extra =
  | {
      type: 'cloze';
      id: string;
      /** Croatian text with exactly one "___" gap. */
      hr: string;
      de: string;
      answers: string[];
      /** If given, shown as choices; otherwise typed. */
      options?: string[];
      hint?: string;
    }
  | {
      type: 'fact';
      id: string;
      question: string;
      options: string[];
      answer: string;
      /** Croatian text to play with the question. */
      audio?: string;
      explain?: string;
    };

export interface Lesson {
  id: string;
  title: string;
  /** Grammar tip shown before the lesson. */
  tip?: string;
  newWords: string[];
  sentences: string[];
  extras?: Extra[];
}

export interface Unit {
  id: string;
  number: number;
  title: string;
  grammar: string;
  tips: Tip[];
  words: Word[];
  sentences: Sentence[];
  lessons: Lesson[];
}

export interface CurriculumUnit {
  id: string;
  number: number;
  title: string;
  grammar: string;
  lessons: string[];
}

export interface Curriculum {
  units: CurriculumUnit[];
}

export function hrVariants(v: HrVariants, speaker: Speaker): string[] {
  return Array.isArray(v) ? v : v[speaker];
}

export function allHrVariants(v: HrVariants): string[] {
  return Array.isArray(v) ? v : [...v.m, ...v.f];
}
