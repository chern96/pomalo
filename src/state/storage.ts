import { dayKey } from './dates';
import { migrate, StateError } from './migrate';
import { defaultState, type AppState } from './schema';

export const STATE_KEY = 'pomalo-state';
export const SESSION_KEY = 'pomalo-session';
export const BACKUP_KEY = 'pomalo-state-backup';

export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function safeStorage(): KV | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadState(kv: KV | null = safeStorage(), today = dayKey()): AppState {
  if (!kv) return defaultState(today);
  let raw: string | null = null;
  try {
    raw = kv.getItem(STATE_KEY);
  } catch {
    return defaultState(today);
  }
  if (!raw) return defaultState(today);
  try {
    return migrate(JSON.parse(raw), today);
  } catch (e) {
    // Never throw away unreadable progress: keep a copy aside.
    try {
      kv.setItem(BACKUP_KEY + '-' + Date.now(), raw);
    } catch {
      /* ignore */
    }
    if (e instanceof StateError || e instanceof SyntaxError) return defaultState(today);
    throw e;
  }
}

export function saveState(state: AppState, kv: KV | null = safeStorage()): boolean {
  if (!kv) return false;
  try {
    kv.setItem(STATE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function loadJson<T>(key: string, kv: KV | null = safeStorage()): T | null {
  try {
    const raw = kv?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveJson(key: string, value: unknown, kv: KV | null = safeStorage()): void {
  try {
    if (value === null) kv?.removeItem(key);
    else kv?.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/** Ask the browser not to evict our storage. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* ignore */
  }
  return false;
}

export function memoryKV(): KV & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}
