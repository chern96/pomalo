import { addDays, daysBetween, type DayKey } from '../state/dates';
import type { WordProgress } from '../state/schema';

// Leitner system with 5 boxes. Box n is due again after INTERVALS[n-1] days.
export const INTERVALS = [1, 3, 7, 14, 30] as const;

export function introduce(today: DayKey): WordProgress {
  return { box: 1, due: addDays(today, 1), learnedAt: today, right: 0, wrong: 0 };
}

export function answer(p: WordProgress | undefined, correct: boolean, today: DayKey): WordProgress {
  const w = p ? { ...p } : introduce(today);
  if (correct) {
    w.right += 1;
    // At most one promotion per day, otherwise a single lesson would push a word to box 5.
    if (w.lastPromoted !== today) {
      w.box = Math.min(5, w.box + 1);
      w.lastPromoted = today;
      w.due = addDays(today, INTERVALS[w.box - 1] ?? 30);
    }
  } else {
    w.wrong += 1;
    w.box = 1;
    w.due = addDays(today, 1);
  }
  return w;
}

export function isDue(p: WordProgress, today: DayKey): boolean {
  return daysBetween(p.due, today) >= 0;
}

/** 0..1 for display. */
export function strength(p: WordProgress | undefined): number {
  return p ? p.box / 5 : 0;
}

/** Lower = weaker. Used to pick words for review after the due ones. */
export function weakness(p: WordProgress): number {
  const total = p.right + p.wrong;
  const errorRate = total ? p.wrong / total : 0;
  return (6 - p.box) + errorRate * 3;
}

/** Word ids for a review: due first (most overdue first), then the weakest. */
export function pickReviewWords(words: Record<string, WordProgress>, today: DayKey, n: number): string[] {
  const entries = Object.entries(words);
  const due = entries
    .filter(([, p]) => isDue(p, today))
    .sort((a, b) => daysBetween(b[1].due, a[1].due) || a[1].box - b[1].box)
    .map(([id]) => id);
  if (due.length >= n) return due.slice(0, n);
  const rest = entries
    .filter(([, p]) => !isDue(p, today))
    .sort((a, b) => weakness(b[1]) - weakness(a[1]))
    .map(([id]) => id);
  return [...due, ...rest].slice(0, n);
}

export function countDue(words: Record<string, WordProgress>, today: DayKey): number {
  return Object.values(words).filter((p) => isDue(p, today)).length;
}
