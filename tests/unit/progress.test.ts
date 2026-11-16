import { describe, expect, it } from 'vitest';
import { addDays, dayKey, daysBetween } from '../../src/state/dates';
import {
  completeActivity,
  goalProgress,
  lessonUnlocked,
  liveStreak,
  nextStage,
  reconcileStreak,
  type ActivityResult,
} from '../../src/state/progress';
import { defaultState, type AppState } from '../../src/state/schema';
import { realLibrary } from './helpers';

const lib = realLibrary();
const L1 = lib.lessons[0]!.id;
const L2 = lib.lessons[1]!.id;

const lesson = (perfect = false, lessonId = L1): ActivityResult => ({
  kind: 'lesson', lessonId, perfect, introduced: [], answers: [],
});
const review: ActivityResult = { kind: 'review', perfect: false, introduced: [], answers: [] };
const quick: ActivityResult = { kind: 'quick', perfect: false, introduced: [], answers: [] };

function play(s: AppState, day: string, r: ActivityResult = lesson()) {
  return completeActivity(s, r, day, lib).state;
}

describe('dates', () => {
  it('counts calendar days across daylight-saving changes', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2); // EU DST start 29 March
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2); // EU DST end 25 October
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('uses local time for the day key', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(dayKey(new Date(2026, 0, 6, 0, 1))).toBe('2026-01-06');
  });
});

describe('XP', () => {
  it('gives 10 per lesson, +5 when perfect, 10 per review, 5 for quick practice', () => {
    let s = defaultState('2026-03-01');
    expect(completeActivity(s, lesson(false), '2026-03-01', lib).xp).toBe(10);
    expect(completeActivity(s, lesson(true), '2026-03-01', lib).xp).toBe(15);
    expect(completeActivity(s, review, '2026-03-01', lib).xp).toBe(10);
    expect(completeActivity(s, quick, '2026-03-01', lib).xp).toBe(5);
    s = play(s, '2026-03-01', lesson(true));
    expect(s.xp).toBe(15);
    expect(s.days['2026-03-01']!.xp).toBe(15);
  });
});

describe('daily goal', () => {
  it('counts lessons and reviews, but not quick practice', () => {
    let s = defaultState('2026-03-01');
    s.settings.dailyGoal = 2;
    s = play(s, '2026-03-01', quick);
    expect(goalProgress(s, '2026-03-01').done).toBe(0);
    const o1 = completeActivity(s, lesson(), '2026-03-01', lib);
    expect(o1.goalReachedNow).toBe(false);
    const o2 = completeActivity(o1.state, review, '2026-03-01', lib);
    expect(o2.goalReachedNow).toBe(true);
    expect(goalProgress(o2.state, '2026-03-01')).toEqual({ done: 2, goal: 2 });
    expect(goalProgress(o2.state, '2026-03-02').done).toBe(0);
  });
});

describe('streak', () => {
  it('counts each calendar day once, whatever the activity', () => {
    let s = defaultState('2026-03-01');
    s = play(s, '2026-03-01');
    s = play(s, '2026-03-01');
    expect(s.streak.current).toBe(1);
    s = play(s, '2026-03-02', quick);
    expect(s.streak.current).toBe(2);
    s = play(s, '2026-03-03', review);
    expect(s.streak.current).toBe(3);
    expect(s.streak.best).toBe(3);
  });

  it('works across a DST change and midnight', () => {
    let s = defaultState('2026-03-28');
    s = play(s, '2026-03-28');
    s = play(s, '2026-03-29');
    s = play(s, '2026-03-30');
    expect(s.streak.current).toBe(3);
  });

  it('resets after a missed day without freezes and tells the user', () => {
    let s = defaultState('2026-03-01');
    s = play(s, '2026-03-01');
    s = play(s, '2026-03-02');
    expect(liveStreak(s, '2026-03-04')).toBe(0);
    s = reconcileStreak(s, '2026-03-04');
    expect(s.streak.current).toBe(0);
    expect(s.notices).toEqual([{ type: 'streak-lost', was: 2 }]);
    s = play(s, '2026-03-04');
    expect(s.streak.current).toBe(1);
    expect(s.streak.best).toBe(2);
  });

  it('earns a freeze every 7 days, at most 2', () => {
    let s = defaultState('2026-03-01');
    for (let i = 0; i < 21; i++) s = play(s, addDays('2026-03-01', i));
    expect(s.streak.current).toBe(21);
    expect(s.streak.freezes).toBe(2);
  });

  it('uses a freeze automatically for a missed day and keeps the streak', () => {
    let s = defaultState('2026-03-01');
    for (let i = 0; i < 7; i++) s = play(s, addDays('2026-03-01', i));
    expect(s.streak.freezes).toBe(1);
    // 2026-03-08 missed, back on 2026-03-09
    s = reconcileStreak(s, '2026-03-09');
    expect(s.streak.freezes).toBe(0);
    expect(s.notices).toEqual([{ type: 'freeze-used', days: 1 }]);
    expect(liveStreak(s, '2026-03-09')).toBe(7);
    s = play(s, '2026-03-09');
    expect(s.streak.current).toBe(8);
  });

  it('does not stretch one freeze over two missed days', () => {
    let s = defaultState('2026-03-01');
    for (let i = 0; i < 7; i++) s = play(s, addDays('2026-03-01', i));
    s = reconcileStreak(s, '2026-03-10');
    expect(s.streak.current).toBe(0);
    expect(s.streak.freezes).toBe(1);
  });

  it('reconciling twice on the same day changes nothing', () => {
    let s = defaultState('2026-03-01');
    s = play(s, '2026-03-01');
    const a = reconcileStreak(s, '2026-03-02');
    expect(reconcileStreak(a, '2026-03-02')).toBe(a);
  });
});

describe('stages and unlocking', () => {
  it('unlocks the next lesson after stage 1 of the previous one', () => {
    let s = defaultState('2026-03-01');
    expect(lessonUnlocked(s, lib, L1)).toBe(true);
    expect(lessonUnlocked(s, lib, L2)).toBe(false);
    s = play(s, '2026-03-01', lesson(false, L1));
    expect(s.lessons[L1]!.stage).toBe(1);
    expect(lessonUnlocked(s, lib, L2)).toBe(true);
  });

  it('first lesson of a unit needs the last lesson of the previous unit', () => {
    const u2first = lib.units[1]!.lessons[0]!.id;
    const u1last = lib.units[0]!.lessons.at(-1)!.id;
    let s = defaultState('2026-03-01');
    expect(lessonUnlocked(s, lib, u2first)).toBe(false);
    s = play(s, '2026-03-01', lesson(false, u1last));
    expect(lessonUnlocked(s, lib, u2first)).toBe(true);
  });

  it('climbs to stage 3 and stays there', () => {
    let s = defaultState('2026-03-01');
    for (let i = 0; i < 5; i++) s = play(s, '2026-03-01', lesson(false, L1));
    expect(s.lessons[L1]!.stage).toBe(3);
    expect(s.lessons[L1]!.completions).toBe(5);
    expect(nextStage(s, L1)).toBe(3);
  });
});

describe('words and badges', () => {
  it('records introduced words and answers', () => {
    const s = completeActivity(
      defaultState('2026-03-01'),
      { kind: 'lesson', lessonId: L1, perfect: false, introduced: ['w-mama'], answers: [{ wordIds: ['w-mama'], correct: false }] },
      '2026-03-01',
      lib,
    ).state;
    expect(s.words['w-mama']!.box).toBe(1);
    expect(s.words['w-mama']!.wrong).toBe(1);
  });

  it('awards the first-lesson and perfect badges once', () => {
    const o = completeActivity(defaultState('2026-03-01'), lesson(true), '2026-03-01', lib);
    expect(o.newBadges).toContain('first-lesson');
    expect(o.newBadges).toContain('perfect');
    const o2 = completeActivity(o.state, lesson(true), '2026-03-01', lib);
    expect(o2.newBadges).toEqual([]);
  });
});
