import { useEffect, useState } from 'preact/hooks';
import { dayKey } from '../state/dates';
import { reconcileStreak } from '../state/progress';
import type { AppState } from '../state/schema';
import { loadState, saveState } from '../state/storage';

// One in-memory app state, persisted on every change.
let state: AppState = reconcileStreak(loadState(), dayKey());
saveState(state);
const listeners = new Set<() => void>();

export function getState(): AppState {
  return state;
}

export function setState(next: AppState): void {
  state = next;
  saveState(state);
  listeners.forEach((l) => l());
}

export function update(fn: (s: AppState) => AppState): void {
  setState(fn(state));
}

/** Re-check streak when the app comes back to the foreground on a new day. */
export function refreshDay(): void {
  const next = reconcileStreak(state, dayKey());
  if (next !== state) setState(next);
}

export function useAppState(): AppState {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => listeners.delete(l);
  }, []);
  return state;
}

/** Re-render once per minute and when the app returns, so "today" stays correct. */
export function useToday(): string {
  const [today, setToday] = useState(dayKey());
  useEffect(() => {
    const tick = () => {
      const t = dayKey();
      if (t !== today) {
        refreshDay();
        setToday(t);
      }
    };
    const id = setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [today]);
  return today;
}
