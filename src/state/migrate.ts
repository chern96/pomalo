import { isDayKey, type DayKey } from './dates';
import { defaultState, SCHEMA_VERSION, type AppState } from './schema';

export class StateError extends Error {}

type Raw = Record<string, unknown>;

/**
 * Migrations from version n to n+1. Never remove one; only append.
 * Example for a future version 2:  1: (s) => ({ ...s, newField: [] }),
 */
export const migrations: Record<number, (s: Raw) => Raw> = {};

function isObj(v: unknown): v is Raw {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Bring any stored or imported state to the current schema. Throws StateError if unusable. */
export function migrate(raw: unknown, today: DayKey, migrationTable = migrations, target = SCHEMA_VERSION): AppState {
  if (!isObj(raw)) throw new StateError('Kein gültiger Fortschritt.');
  let version = raw.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new StateError('Fortschritt ohne gültige Versionsnummer.');
  }
  if (version > target) {
    throw new StateError('Dieser Fortschritt stammt aus einer neueren App-Version. Bitte erst die App aktualisieren.');
  }
  let s: Raw = raw;
  while (version < target) {
    const step = migrationTable[version];
    if (!step) throw new StateError(`Keine Migration von Version ${version}.`);
    s = step(s);
    version += 1;
    s.schemaVersion = version;
  }
  return fillDefaults(s, today);
}

/** Merge onto defaults so fields added later always exist, and drop malformed entries. */
function fillDefaults(s: Raw, today: DayKey): AppState {
  const d = defaultState(today);
  const out: AppState = {
    ...d,
    schemaVersion: SCHEMA_VERSION,
    createdAt: isDayKey(s.createdAt) ? s.createdAt : d.createdAt,
    onboarded: s.onboarded === true,
    settings: { ...d.settings, ...(isObj(s.settings) ? (s.settings as Partial<AppState['settings']>) : {}) },
    xp: typeof s.xp === 'number' && s.xp >= 0 ? s.xp : 0,
    words: {},
    lessons: {},
    days: {},
    streak: { ...d.streak, ...(isObj(s.streak) ? (s.streak as Partial<AppState['streak']>) : {}) },
    badges: {},
    notices: Array.isArray(s.notices) ? (s.notices as AppState['notices']) : [],
    counters: { ...d.counters, ...(isObj(s.counters) ? (s.counters as Partial<AppState['counters']>) : {}) },
    seenTips: Array.isArray(s.seenTips) ? s.seenTips.filter((x): x is string => typeof x === 'string') : [],
  };
  if (isObj(s.words)) {
    for (const [id, w] of Object.entries(s.words)) {
      if (isObj(w) && typeof w.box === 'number' && isDayKey(w.due)) {
        out.words[id] = {
          box: Math.min(5, Math.max(1, Math.round(w.box))),
          due: w.due,
          learnedAt: isDayKey(w.learnedAt) ? w.learnedAt : w.due,
          lastPromoted: isDayKey(w.lastPromoted) ? w.lastPromoted : undefined,
          right: typeof w.right === 'number' ? w.right : 0,
          wrong: typeof w.wrong === 'number' ? w.wrong : 0,
        };
      }
    }
  }
  if (isObj(s.lessons)) {
    for (const [id, l] of Object.entries(s.lessons)) {
      if (isObj(l) && typeof l.stage === 'number') {
        out.lessons[id] = {
          stage: Math.min(3, Math.max(0, Math.round(l.stage))),
          completions: typeof l.completions === 'number' ? l.completions : 1,
          lastPlayed: isDayKey(l.lastPlayed) ? l.lastPlayed : today,
        };
      }
    }
  }
  if (isObj(s.days)) {
    for (const [k, v] of Object.entries(s.days)) {
      if (isDayKey(k) && isObj(v)) {
        out.days[k] = {
          xp: typeof v.xp === 'number' ? v.xp : 0,
          rounds: typeof v.rounds === 'number' ? v.rounds : 0,
          activities: typeof v.activities === 'number' ? v.activities : 0,
        };
      }
    }
  }
  if (isObj(s.badges)) {
    for (const [k, v] of Object.entries(s.badges)) if (isDayKey(v)) out.badges[k] = v;
  }
  if (![1, 2, 3, 5].includes(out.settings.dailyGoal)) out.settings.dailyGoal = 1;
  if (out.settings.speaker !== 'f') out.settings.speaker = 'm';
  if (out.streak.lastDay !== null && !isDayKey(out.streak.lastDay)) out.streak.lastDay = null;
  out.streak.freezes = Math.min(2, Math.max(0, Math.floor(Number(out.streak.freezes) || 0)));
  return out;
}
