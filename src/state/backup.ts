import type { DayKey } from './dates';
import { migrate, StateError } from './migrate';
import type { AppState } from './schema';

const APP_TAG = 'pomalo-backup';

export interface BackupFile {
  app: typeof APP_TAG;
  exportedAt: string;
  state: AppState;
}

export function exportBackup(state: AppState, now = new Date()): string {
  const file: BackupFile = { app: APP_TAG, exportedAt: now.toISOString(), state };
  return JSON.stringify(file);
}

export function backupFileName(today: DayKey): string {
  return `pomalo-fortschritt-${today}.json`;
}

export interface ImportPreview {
  state: AppState;
  exportedAt: string | null;
  words: number;
  lessons: number;
  xp: number;
}

/** Parse and check a backup. Throws StateError with a German message if unusable. */
export function parseBackup(text: string, today: DayKey): ImportPreview {
  let data: unknown;
  try {
    data = JSON.parse(text.trim());
  } catch {
    throw new StateError('Das ist kein gültiger Sicherungstext.');
  }
  if (typeof data !== 'object' || data === null || (data as { app?: unknown }).app !== APP_TAG) {
    throw new StateError('Das ist keine Pomalo-Sicherung.');
  }
  const file = data as { exportedAt?: unknown; state?: unknown };
  const state = migrate(file.state, today);
  return {
    state,
    exportedAt: typeof file.exportedAt === 'string' ? file.exportedAt : null,
    words: Object.keys(state.words).length,
    lessons: Object.keys(state.lessons).length,
    xp: state.xp,
  };
}
