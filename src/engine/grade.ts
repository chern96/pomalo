// Answer grading for typed answers and sentence tiles.

export type Verdict = 'correct' | 'almost' | 'wrong';

export interface GradeResult {
  verdict: Verdict;
  /** The accepted answer closest to what was typed (for feedback). */
  expected: string;
  reason?: 'diacritics' | 'typo';
}

export interface GradeOptions {
  lang: 'hr' | 'de';
  /** Task checks exactly an ending/form: no typo tolerance. */
  strict?: boolean;
  /** Lowercased Croatian forms known in the content (to detect "typos" that are real words). */
  knownForms?: Set<string>;
}

const PUNCT = /[.,!?;:¿¡"'„“”‚‘’«»()…–—\-/]/g;

export function normalize(s: string): string {
  return s.normalize('NFC').toLowerCase().replace(PUNCT, ' ').replace(/\s+/g, ' ').trim();
}

/** Croatian letters without diacritics. đ → d, so "d" and "dj" both work (see foldAnswerHr). */
export function foldHr(s: string): string {
  return s.replace(/[čć]/g, 'c').replace(/š/g, 's').replace(/ž/g, 'z').replace(/đ/g, 'd');
}

function foldAnswerHr(answer: string, expected: string): string[] {
  const base = foldHr(answer);
  // "dj" typed for đ: only when the expected text actually has a đ.
  return expected.includes('đ') ? [base, foldHr(answer.replace(/dj/g, 'đ'))] : [base];
}

export function foldDe(s: string): string {
  return s.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
}

const DE_ARTICLE = /^(der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines) /;

/** Optimal string alignment distance (Damerau–Levenshtein with adjacent swaps). */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const row = d[i]!;
      const prev = d[i - 1]!;
      row[j] = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        row[j] = Math.min(row[j]!, d[i - 2]![j - 2]! + 1);
      }
    }
  }
  return d[m]![n]!;
}

type TokenVerdict = 'exact' | 'diacritics' | 'typo' | 'wrong';

function compareTokens(a: string, e: string, opts: GradeOptions, typoAllowed: boolean): TokenVerdict {
  if (a === e) return 'exact';
  // A different existing word or form is always wrong (kava/kavu, kuca/kuća).
  const isOtherForm = opts.lang === 'hr' && opts.knownForms?.has(a);
  if (opts.lang === 'hr') {
    if (!isOtherForm && foldAnswerHr(a, e).includes(foldHr(e))) return 'diacritics';
  } else if (foldDe(a) === foldDe(e)) {
    return 'diacritics';
  }
  if (!typoAllowed || opts.strict || isOtherForm || e.length < 5) return 'wrong';
  const fa = opts.lang === 'hr' ? foldHr(a) : foldDe(a);
  const fe = opts.lang === 'hr' ? foldHr(e) : foldDe(e);
  return editDistance(fa, fe) <= 1 ? 'typo' : 'wrong';
}

function gradeAgainst(answer: string, expected: string, opts: GradeOptions): 'correct' | 'wrong' | 'typo' | 'diacritics' {
  let a = normalize(answer);
  let e = normalize(expected);
  if (opts.lang === 'de') {
    a = a.replace(DE_ARTICLE, '');
    e = e.replace(DE_ARTICLE, '');
  }
  if (a === e) return 'correct';
  const at = a.split(' ');
  const et = e.split(' ');
  if (at.length !== et.length) return 'wrong';
  let typos = 0;
  let diacritics = false;
  for (let i = 0; i < et.length; i++) {
    const v = compareTokens(at[i]!, et[i]!, opts, typos === 0);
    if (v === 'wrong') return 'wrong';
    if (v === 'typo') typos += 1;
    if (v === 'diacritics') diacritics = true;
  }
  if (typos) return 'typo';
  return diacritics ? 'diacritics' : 'correct';
}

export function grade(answer: string, accepted: string[], opts: GradeOptions): GradeResult {
  if (!accepted.length) throw new Error('grade() needs at least one accepted answer');
  let best: GradeResult = { verdict: 'wrong', expected: accepted[0]! };
  const rank = { correct: 3, diacritics: 2, typo: 1, wrong: 0 } as const;
  let bestRank = 0;
  for (const exp of accepted) {
    const v = gradeAgainst(answer, exp, opts);
    if (rank[v] > bestRank) {
      bestRank = rank[v];
      best =
        v === 'correct'
          ? { verdict: 'correct', expected: exp }
          : v === 'wrong'
            ? best
            : { verdict: 'almost', expected: exp, reason: v };
      if (v === 'correct') break;
    }
  }
  return best;
}

/** Tiles: compare the built sentence against accepted variants (no typo tolerance needed). */
export function gradeTiles(built: string[], accepted: string[]): GradeResult {
  const b = normalize(built.join(' '));
  const hit = accepted.find((s) => normalize(s) === b);
  return hit ? { verdict: 'correct', expected: hit } : { verdict: 'wrong', expected: accepted[0] ?? '' };
}

/** Split a sentence into tiles (punctuation dropped). */
export function toTiles(sentence: string): string[] {
  return sentence
    .replace(/[.,!?;:„“"…]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}
