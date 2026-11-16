import { addDays, daysBetween, type DayKey } from './dates';
import type { AppState } from './schema';
import * as srs from '../engine/srs';
import type { Library } from '../content/library';
import { evaluateBadges } from './badges';

export const XP = { lesson: 10, perfectBonus: 5, review: 10, quick: 5 } as const;
export const FREEZE_EVERY = 7;
export const MAX_FREEZES = 2;
export const MAX_STAGE = 3;

export type ActivityKind = 'lesson' | 'review' | 'quick';

export interface ActivityResult {
  kind: ActivityKind;
  lessonId?: string;
  perfect: boolean;
  /** Word ids introduced in this activity. */
  introduced: string[];
  /** Every graded answer, in order (repeats included). */
  answers: { wordIds: string[]; correct: boolean }[];
}

export interface ActivityOutcome {
  state: AppState;
  xp: number;
  streakBefore: number;
  streakAfter: number;
  freezeEarned: boolean;
  goalReachedNow: boolean;
  newBadges: string[];
  stageAfter?: number;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/**
 * Called on app start (and before recording activity): applies streak freezes for missed days
 * or resets the streak. Calendar days only.
 */
export function reconcileStreak(input: AppState, today: DayKey): AppState {
  const s = input.streak;
  if (!s.lastDay || s.current === 0) return input;
  const gap = daysBetween(s.lastDay, today);
  if (gap <= 1) return input;
  const state = clone(input);
  const missed = gap - 1;
  if (state.streak.freezes >= missed) {
    state.streak.freezes -= missed;
    state.streak.lastDay = addDays(today, -1);
    state.notices.push({ type: 'freeze-used', days: missed });
  } else {
    state.notices.push({ type: 'streak-lost', was: state.streak.current });
    state.streak.current = 0;
    state.streak.lastDay = null;
  }
  return state;
}

/** Streak shown right now: 0 if yesterday was missed (before reconciliation decides). */
export function liveStreak(state: AppState, today: DayKey): number {
  const { lastDay, current } = state.streak;
  if (!lastDay) return 0;
  return daysBetween(lastDay, today) <= 1 ? current : 0;
}

export function playedToday(state: AppState, today: DayKey): boolean {
  return state.streak.lastDay === today && (state.days[today]?.activities ?? 0) > 0;
}

export function goalProgress(state: AppState, today: DayKey): { done: number; goal: number } {
  return { done: state.days[today]?.rounds ?? 0, goal: state.settings.dailyGoal };
}

export function lessonUnlocked(state: AppState, lib: Library, lessonId: string): boolean {
  const idx = lib.lessons.findIndex((l) => l.id === lessonId);
  if (idx < 0) return false;
  if (idx === 0) return true;
  const prev = lib.lessons[idx - 1];
  return !!prev && (state.lessons[prev.id]?.stage ?? 0) >= 1;
}

/** Stage the next play of a lesson runs at (1–3). */
export function nextStage(state: AppState, lessonId: string): number {
  return Math.min(MAX_STAGE, (state.lessons[lessonId]?.stage ?? 0) + 1);
}

export function completeActivity(
  input: AppState,
  result: ActivityResult,
  today: DayKey,
  lib: Library,
): ActivityOutcome {
  let state = reconcileStreak(input, today);
  state = clone(state);
  const streakBefore = liveStreak(state, today);

  // Words
  for (const id of result.introduced) if (!state.words[id]) state.words[id] = srs.introduce(today);
  for (const a of result.answers) {
    for (const id of a.wordIds) {
      if (!lib.words.has(id)) continue;
      state.words[id] = srs.answer(state.words[id], a.correct, today);
    }
  }

  // XP
  let xp = 0;
  if (result.kind === 'lesson') xp = XP.lesson + (result.perfect ? XP.perfectBonus : 0);
  else if (result.kind === 'review') xp = XP.review;
  else xp = XP.quick;
  state.xp += xp;

  // Lesson stage
  let stageAfter: number | undefined;
  if (result.kind === 'lesson' && result.lessonId) {
    const prev = state.lessons[result.lessonId];
    stageAfter = Math.min(MAX_STAGE, (prev?.stage ?? 0) + 1);
    state.lessons[result.lessonId] = {
      stage: stageAfter,
      completions: (prev?.completions ?? 0) + 1,
      lastPlayed: today,
    };
  }

  // Day log and goal
  const day = state.days[today] ?? { xp: 0, rounds: 0, activities: 0 };
  const goalBefore = day.rounds >= state.settings.dailyGoal;
  day.xp += xp;
  day.activities += 1;
  if (result.kind !== 'quick') day.rounds += 1;
  state.days[today] = day;
  const goalReachedNow = !goalBefore && day.rounds >= state.settings.dailyGoal;

  // Counters
  if (result.kind === 'review') state.counters.reviews += 1;
  if (result.kind === 'quick') state.counters.quick += 1;
  if (result.kind === 'lesson' && result.perfect) state.counters.perfectLessons += 1;
  state.counters.maxRoundsPerDay = Math.max(state.counters.maxRoundsPerDay, day.rounds);

  // Streak
  let freezeEarned = false;
  if (state.streak.lastDay !== today) {
    const continues = state.streak.lastDay !== null && daysBetween(state.streak.lastDay, today) === 1;
    state.streak.current = continues ? state.streak.current + 1 : 1;
    state.streak.lastDay = today;
    state.streak.best = Math.max(state.streak.best, state.streak.current);
    if (state.streak.current % FREEZE_EVERY === 0 && state.streak.freezes < MAX_FREEZES) {
      state.streak.freezes += 1;
      freezeEarned = true;
    }
  }

  const newBadges = evaluateBadges(state, lib).filter((b) => !state.badges[b]);
  for (const b of newBadges) state.badges[b] = today;

  return {
    state,
    xp,
    streakBefore,
    streakAfter: state.streak.current,
    freezeEarned,
    goalReachedNow,
    newBadges,
    stageAfter,
  };
}

export function xpLastDays(state: AppState, today: DayKey, n = 7): { day: DayKey; xp: number }[] {
  const out: { day: DayKey; xp: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const day = addDays(today, -i);
    out.push({ day, xp: state.days[day]?.xp ?? 0 });
  }
  return out;
}
