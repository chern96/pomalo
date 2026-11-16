import type { DayKey } from './dates';

export const SCHEMA_VERSION = 1;

export type DailyGoal = 1 | 2 | 3 | 5;
export const DAILY_GOALS: DailyGoal[] = [1, 2, 3, 5];

export interface WordProgress {
  /** Leitner box 1–5. */
  box: number;
  due: DayKey;
  learnedAt: DayKey;
  /** Day of the last promotion: a word moves up at most one box per day. */
  lastPromoted?: DayKey;
  right: number;
  wrong: number;
}

export interface LessonProgress {
  /** Highest completed stage (crowns), 0–3. */
  stage: number;
  completions: number;
  lastPlayed: DayKey;
}

export interface DayLog {
  xp: number;
  /** Lessons and reviews (count toward the daily goal). */
  rounds: number;
  /** All finished activities including quick practice. */
  activities: number;
}

export type Notice =
  | { type: 'freeze-used'; days: number }
  | { type: 'streak-lost'; was: number };

export interface Settings {
  dailyGoal: DailyGoal;
  speaker: 'm' | 'f';
  sfx: boolean;
  speaking: boolean;
  autoplay: boolean;
  /** User chose to keep using the browser tab instead of installing. */
  browserOk: boolean;
}

export interface AppState {
  schemaVersion: number;
  createdAt: DayKey;
  onboarded: boolean;
  settings: Settings;
  xp: number;
  words: Record<string, WordProgress>;
  lessons: Record<string, LessonProgress>;
  days: Record<DayKey, DayLog>;
  streak: {
    current: number;
    best: number;
    /** Last day that counts for the streak (played or covered by a freeze). */
    lastDay: DayKey | null;
    freezes: number;
  };
  /** Badge id → day earned. */
  badges: Record<string, DayKey>;
  notices: Notice[];
  counters: { reviews: number; quick: number; perfectLessons: number; maxRoundsPerDay: number };
  seenTips: string[];
}

export function defaultState(today: DayKey): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: today,
    onboarded: false,
    settings: { dailyGoal: 1, speaker: 'm', sfx: true, speaking: true, autoplay: true, browserOk: false },
    xp: 0,
    words: {},
    lessons: {},
    days: {},
    streak: { current: 0, best: 0, lastDay: null, freezes: 0 },
    badges: {},
    notices: [],
    counters: { reviews: 0, quick: 0, perfectLessons: 0, maxRoundsPerDay: 0 },
    seenTips: [],
  };
}
