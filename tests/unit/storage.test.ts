import { describe, expect, it } from 'vitest';
import { exportBackup, parseBackup } from '../../src/state/backup';
import { migrate, StateError } from '../../src/state/migrate';
import { defaultState, SCHEMA_VERSION } from '../../src/state/schema';
import { BACKUP_KEY, loadState, memoryKV, saveState, STATE_KEY } from '../../src/state/storage';

const today = '2026-03-01';

describe('storage', () => {
  it('starts with a default state', () => {
    const s = loadState(memoryKV(), today);
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(s.onboarded).toBe(false);
  });

  it('round-trips the state', () => {
    const kv = memoryKV();
    const s = defaultState(today);
    s.xp = 42;
    s.words['w-mama'] = { box: 2, due: '2026-03-04', learnedAt: today, right: 1, wrong: 0 };
    s.lessons['l-u01-1'] = { stage: 1, completions: 1, lastPlayed: today };
    expect(saveState(s, kv)).toBe(true);
    expect(loadState(kv, today)).toEqual(s);
  });

  it('keeps unreadable data aside instead of deleting it', () => {
    const kv = memoryKV();
    kv.setItem(STATE_KEY, '{kaputt');
    const s = loadState(kv, today);
    expect(s.xp).toBe(0);
    expect([...kv.data.keys()].some((k) => k.startsWith(BACKUP_KEY))).toBe(true);
  });
});

describe('migrate', () => {
  it('fills fields added in later versions', () => {
    const s = migrate({ schemaVersion: 1, xp: 30, words: {}, onboarded: true }, today);
    expect(s.xp).toBe(30);
    expect(s.settings.dailyGoal).toBe(1);
    expect(s.counters.reviews).toBe(0);
  });

  it('runs migration steps in order', () => {
    const table = {
      1: (s: Record<string, unknown>) => ({ ...s, xp: (s.xp as number) * 2 }),
      2: (s: Record<string, unknown>) => ({ ...s, xp: (s.xp as number) + 1 }),
    };
    const s = migrate({ schemaVersion: 1, xp: 10 }, today, table, 3);
    expect(s.xp).toBe(21);
  });

  it('refuses data from a newer app version', () => {
    expect(() => migrate({ schemaVersion: SCHEMA_VERSION + 1 }, today)).toThrow(StateError);
  });

  it('drops malformed entries but keeps the good ones', () => {
    const s = migrate(
      {
        schemaVersion: 1,
        words: { good: { box: 9, due: '2026-03-02', right: 1, wrong: 0 }, bad: { box: 'x' } },
        lessons: { l1: { stage: 7 }, l2: 'nope' },
        settings: { dailyGoal: 4, speaker: 'x' },
      },
      today,
    );
    expect(Object.keys(s.words)).toEqual(['good']);
    expect(s.words.good!.box).toBe(5);
    expect(s.lessons.l1!.stage).toBe(3);
    expect(s.lessons.l2).toBeUndefined();
    expect(s.settings.dailyGoal).toBe(1);
    expect(s.settings.speaker).toBe('m');
  });
});

describe('backup', () => {
  it('exports and imports the same progress', () => {
    const s = defaultState(today);
    s.xp = 99;
    s.onboarded = true;
    s.words['w-voda'] = { box: 3, due: '2026-03-08', learnedAt: today, right: 3, wrong: 1 };
    const p = parseBackup(exportBackup(s), today);
    expect(p.state).toEqual(s);
    expect(p.words).toBe(1);
    expect(p.xp).toBe(99);
  });

  it('rejects text that is not a Pomalo backup', () => {
    expect(() => parseBackup('hallo', today)).toThrow(StateError);
    expect(() => parseBackup('{"foo":1}', today)).toThrow('keine Pomalo-Sicherung');
    expect(() => parseBackup('{"app":"pomalo-backup","state":{"schemaVersion":99}}', today)).toThrow(StateError);
  });

  it('tolerates surrounding whitespace from copy & paste', () => {
    const text = '\n  ' + exportBackup(defaultState(today)) + '  \n';
    expect(parseBackup(text, today).state.schemaVersion).toBe(SCHEMA_VERSION);
  });
});
