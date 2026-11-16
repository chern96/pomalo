// Runtime exercise objects. Generated from content, never stored in content files.

export type Dir = 'hr-de' | 'de-hr';

interface Base {
  id: string;
  /** Words this exercise trains (for spaced repetition). */
  wordIds: string[];
}

export type Exercise =
  | (Base & { kind: 'intro'; wordId: string })
  | (Base & { kind: 'choice'; dir: Dir; prompt: string; options: string[]; answer: string; audio?: string })
  | (Base & { kind: 'pairs'; pairs: { wordId: string; hr: string; de: string; say: string }[] })
  | (Base & { kind: 'translate'; dir: Dir; prompt: string; accepted: string[]; audio?: string; hint?: string })
  | (Base & { kind: 'tiles'; prompt: string; tiles: string[]; accepted: string[] })
  | (Base & { kind: 'cloze'; hr: string; de: string; answers: string[]; options?: string[]; hint?: string })
  | (Base & { kind: 'listen'; mode: 'choice' | 'type'; audio: string; options?: string[]; accepted: string[]; de: string })
  | (Base & { kind: 'speak'; hr: string; de: string })
  | (Base & { kind: 'fact'; question: string; options: string[]; answer: string; audio?: string; explain?: string });

export type ExerciseKind = Exercise['kind'];

export function needsAudio(e: Exercise): boolean {
  return e.kind === 'listen' || e.kind === 'speak';
}

/** Graded exercises count as tasks; intro cards and speaking self-checks do not get graded. */
export function isGraded(e: Exercise): boolean {
  return e.kind !== 'intro' && e.kind !== 'speak';
}

/** Intro cards are not counted as tasks. */
export function isTask(e: Exercise): boolean {
  return e.kind !== 'intro';
}
