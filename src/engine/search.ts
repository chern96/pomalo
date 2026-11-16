import type { Word } from '../content/types';
import { foldDe, foldHr, normalize } from './grade';

/** Search ignores case and diacritics: "sto" finds "što", "Haus" finds "kuća". */
export function matchesWord(w: Word, query: string): boolean {
  const q = foldHr(foldDe(normalize(query)));
  if (!q) return true;
  const hay = [w.hr, ...(w.hrAlt ?? []), ...(w.colloquial ?? []), ...w.de, w.present ?? '']
    .map((x) => foldHr(foldDe(normalize(x))))
    .join(' | ');
  return hay.includes(q);
}
