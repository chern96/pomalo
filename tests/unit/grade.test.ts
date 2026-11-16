import { describe, expect, it } from 'vitest';
import { editDistance, grade, gradeTiles, normalize, toTiles } from '../../src/engine/grade';

const known = new Set(['kava', 'kavu', 'kuća', 'kuca', 'brat', 'brata', 'umoran', 'umorna']);
const hr = { lang: 'hr' as const, knownForms: known };
const de = { lang: 'de' as const };

describe('normalize', () => {
  it('ignores case, punctuation and extra spaces', () => {
    expect(normalize('  Dobro,   hvala!  A ti? ')).toBe('dobro hvala a ti');
  });
});

describe('grade – Croatian', () => {
  it('accepts exact answers regardless of case and punctuation', () => {
    expect(grade('zovem SE ana', ['Zovem se Ana.'], hr).verdict).toBe('correct');
  });

  it('treats missing diacritics as almost right', () => {
    const r = grade('secer', ['šećer'], hr);
    expect(r.verdict).toBe('almost');
    expect(r.reason).toBe('diacritics');
    expect(grade('zena', ['žena'], hr).verdict).toBe('almost');
    expect(grade('cevapi', ['ćevapi'], hr).verdict).toBe('almost');
  });

  it('accepts d and dj for đ', () => {
    expect(grade('rodak', ['rođak'], hr).verdict).toBe('almost');
    expect(grade('rodjak', ['rođak'], hr).verdict).toBe('almost');
    expect(grade('dovidjenja', ['doviđenja'], hr).verdict).toBe('almost');
  });

  it('does not accept dj→d swaps where the word has no đ', () => {
    // "ded" is not "djed" (ijekavian form is the lesson)
    expect(grade('ded', ['djed'], hr).verdict).toBe('wrong');
  });

  it('allows one small typo in words of 5+ letters', () => {
    const r = grade('prijatlj', ['prijatelj'], hr);
    expect(r.verdict).toBe('almost');
    expect(r.reason).toBe('typo');
    expect(grade('mljieko', ['mlijeko'], hr).verdict).toBe('almost'); // swapped letters
  });

  it('is strict for short words', () => {
    expect(grade('sik', ['sok'], hr).verdict).toBe('wrong');
  });

  it('is strict when the typo is another existing form', () => {
    expect(grade('kava', ['kavu'], hr).verdict).toBe('wrong');
    expect(grade('brat', ['brata'], hr).verdict).toBe('wrong');
    expect(grade('umoran', ['umorna'], hr).verdict).toBe('wrong');
  });

  it('is strict for ending tasks', () => {
    expect(grade('prijatlj', ['prijatelj'], { ...hr, strict: true }).verdict).toBe('wrong');
  });

  it('allows only one typo per answer', () => {
    expect(grade('prijatlj mlijeko', ['prijatelj mlijeko'], hr).verdict).toBe('almost');
    expect(grade('prijatlj mljeko', ['prijatelj mlijeko'], hr).verdict).toBe('wrong');
  });

  it('accepts any listed variant (with or without pronoun, word order)', () => {
    const acc = ['Umoran sam.', 'Ja sam umoran.'];
    expect(grade('ja sam umoran', acc, hr).verdict).toBe('correct');
    expect(grade('umoran sam', acc, hr).verdict).toBe('correct');
    expect(grade('sam umoran', acc, hr).verdict).toBe('wrong');
  });

  it('returns the closest expected answer for feedback', () => {
    expect(grade('ja sam umoran', ['Umoran sam.', 'Ja sam umoran.'], hr).expected).toBe('Ja sam umoran.');
  });
});

describe('grade – German', () => {
  it('accepts ae/oe/ue/ss', () => {
    expect(grade('Schoen', ['schön'], de).verdict).toBe('almost');
    expect(grade('Gruesse', ['Grüße'], de).verdict).toBe('almost');
  });
  it('makes articles optional', () => {
    expect(grade('der Bruder', ['Bruder'], de).verdict).toBe('correct');
    expect(grade('Bruder', ['der Bruder'], de).verdict).toBe('correct');
  });
  it('accepts synonyms', () => {
    expect(grade('Vetter', ['Cousin', 'Vetter'], de).verdict).toBe('correct');
  });
  it('rejects wrong answers', () => {
    expect(grade('Schwester', ['Bruder'], de).verdict).toBe('wrong');
  });
});

describe('tiles', () => {
  it('splits sentences into tiles without punctuation', () => {
    expect(toTiles('Dobro, hvala. A ti?')).toEqual(['Dobro', 'hvala', 'A', 'ti']);
  });
  it('accepts any variant order', () => {
    const acc = ['Zovem se Ana.', 'Ja se zovem Ana.'];
    expect(gradeTiles(['ja', 'se', 'zovem', 'Ana'], acc).verdict).toBe('correct');
    expect(gradeTiles(['se', 'zovem', 'Ana'], acc).verdict).toBe('wrong');
  });
});

describe('editDistance', () => {
  it('counts swaps as one edit', () => {
    expect(editDistance('ab', 'ba')).toBe(1);
    expect(editDistance('kitten', 'sitting')).toBe(3);
  });
});
