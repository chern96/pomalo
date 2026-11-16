import { describe, expect, it } from 'vitest';
import { answer, countDue, introduce, isDue, pickReviewWords } from '../../src/engine/srs';
import { addDays } from '../../src/state/dates';

describe('Leitner repetition', () => {
  it('a new word is due tomorrow', () => {
    const p = introduce('2026-03-01');
    expect(p.box).toBe(1);
    expect(p.due).toBe('2026-03-02');
  });

  it('promotes at most one box per day', () => {
    let p = introduce('2026-03-01');
    p = answer(p, true, '2026-03-01');
    p = answer(p, true, '2026-03-01');
    p = answer(p, true, '2026-03-01');
    expect(p.box).toBe(2);
    expect(p.due).toBe('2026-03-04');
    p = answer(p, true, '2026-03-04');
    expect(p.box).toBe(3);
    expect(p.due).toBe('2026-03-11');
  });

  it('caps at box 5 with a 30-day interval', () => {
    let p = introduce('2026-01-01');
    for (let d = 1; d <= 8; d++) p = answer(p, true, addDays('2026-01-01', d));
    expect(p.box).toBe(5);
    expect(p.due).toBe(addDays('2026-01-09', 30));
  });

  it('a wrong answer sends the word back to box 1', () => {
    let p = introduce('2026-03-01');
    p = answer(p, true, '2026-03-02');
    p = answer(p, false, '2026-03-02');
    expect(p.box).toBe(1);
    expect(p.due).toBe('2026-03-03');
    expect(p.wrong).toBe(1);
  });

  it('due check works over month boundaries', () => {
    const p = { ...introduce('2026-01-31') };
    expect(isDue(p, '2026-01-31')).toBe(false);
    expect(isDue(p, '2026-02-01')).toBe(true);
  });

  it('picks due words first, most overdue first, then weak ones', () => {
    const words = {
      a: { box: 3, due: '2026-03-10', learnedAt: '2026-03-01', right: 5, wrong: 0 },
      b: { box: 1, due: '2026-03-05', learnedAt: '2026-03-01', right: 0, wrong: 0 },
      c: { box: 2, due: '2026-03-20', learnedAt: '2026-03-01', right: 1, wrong: 4 },
      d: { box: 5, due: '2026-04-20', learnedAt: '2026-03-01', right: 9, wrong: 0 },
    };
    expect(pickReviewWords(words, '2026-03-12', 3)).toEqual(['b', 'a', 'c']);
    expect(countDue(words, '2026-03-12')).toBe(2);
  });
});
