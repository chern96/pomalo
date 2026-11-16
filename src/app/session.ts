import type { Exercise } from '../engine/exercises';
import { loadJson, saveJson, SESSION_KEY } from '../state/storage';

// Saved state of a running lesson, so iOS unloading the app does not reset it.

export type SessionKind = 'lesson' | 'review' | 'quick';

export interface SavedSession {
  key: string; // e.g. "lesson:l-u01-1", "review", "quick"
  kind: SessionKind;
  lessonId?: string;
  stage?: number;
  queue: Exercise[];
  index: number;
  answers: { wordIds: string[]; correct: boolean }[];
  /** Exercise ids that were answered wrong at least once. */
  missed: string[];
  introduced: string[];
  audioOff: boolean;
  startedAt: number;
}

const MAX_AGE_MS = 12 * 60 * 60 * 1000;

export function loadSession(key: string): SavedSession | null {
  const s = loadJson<SavedSession>(SESSION_KEY);
  if (!s || s.key !== key || Date.now() - s.startedAt > MAX_AGE_MS) return null;
  if (!Array.isArray(s.queue) || typeof s.index !== 'number') return null;
  return s;
}

export function anySession(): SavedSession | null {
  const s = loadJson<SavedSession>(SESSION_KEY);
  if (!s || Date.now() - s.startedAt > MAX_AGE_MS) return null;
  return s;
}

export function saveSession(s: SavedSession | null): void {
  saveJson(SESSION_KEY, s);
}

/** True while a lesson is open – app updates wait until it is finished. */
let active = false;
export function setLessonActive(v: boolean): void {
  active = v;
}
export function isLessonActive(): boolean {
  return active;
}
