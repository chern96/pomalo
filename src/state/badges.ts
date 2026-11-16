import type { Library } from '../content/library';
import type { AppState } from './schema';

export interface BadgeDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  check: (s: AppState, lib: Library) => boolean;
}

function unitDone(s: AppState, lib: Library, unitId: string, stage = 1): boolean {
  const u = lib.unitById.get(unitId);
  return !!u && u.lessons.length > 0 && u.lessons.every((l) => (s.lessons[l.id]?.stage ?? 0) >= stage);
}

/** Units whose grammar topic is a grammatical case. */
export const CASE_UNITS = ['u08', 'u14', 'u15', 'u16', 'u18', 'u19', 'u25'];

export const BADGES: BadgeDef[] = [
  { id: 'first-lesson', title: 'Prvi korak', description: 'Erste Lektion geschafft', icon: '🐾',
    check: (s) => Object.keys(s.lessons).length >= 1 },
  { id: 'perfect', title: 'Bez greške', description: 'Eine Lektion fehlerfrei', icon: '💎',
    check: (s) => s.counters.perfectLessons >= 1 },
  { id: 'streak-3', title: 'Warm gelaufen', description: '3 Tage Streak', icon: '🔥',
    check: (s) => s.streak.best >= 3 },
  { id: 'streak-7', title: 'Eine Woche', description: '7 Tage Streak', icon: '🌞',
    check: (s) => s.streak.best >= 7 },
  { id: 'streak-30', title: 'Ein Monat', description: '30 Tage Streak', icon: '🏆',
    check: (s) => s.streak.best >= 30 },
  { id: 'words-50', title: '50 Wörter', description: '50 Wörter gelernt', icon: '📗',
    check: (s) => Object.keys(s.words).length >= 50 },
  { id: 'words-100', title: '100 Wörter', description: '100 Wörter gelernt', icon: '📘',
    check: (s) => Object.keys(s.words).length >= 100 },
  { id: 'words-250', title: '250 Wörter', description: '250 Wörter gelernt', icon: '📚',
    check: (s) => Object.keys(s.words).length >= 250 },
  { id: 'pronunciation', title: 'Aussprache-Ass', description: 'Einheit 1 abgeschlossen', icon: '🗣️',
    check: (s, lib) => unitDone(s, lib, 'u01') },
  { id: 'family', title: 'Familienmensch', description: 'Einheit „Familie" abgeschlossen', icon: '👨‍👩‍👧',
    check: (s, lib) => unitDone(s, lib, 'u04') },
  { id: 'gold-unit', title: 'Goldene Einheit', description: 'Alle Lektionen einer Einheit auf Stufe 3', icon: '👑',
    check: (s, lib) => lib.units.some((u) => unitDone(s, lib, u.id, 3)) },
  { id: 'cases', title: 'Fälle-Profi', description: 'Alle Einheiten zu den Fällen abgeschlossen', icon: '🎓',
    check: (s, lib) => CASE_UNITS.every((id) => lib.unitById.has(id) && unitDone(s, lib, id)) },
  { id: 'busy', title: 'Fleißig', description: '5 Runden an einem Tag', icon: '⚡',
    check: (s) => s.counters.maxRoundsPerDay >= 5 },
  { id: 'reviewer', title: 'Wiederholungs-Held', description: '25 Wiederholungen', icon: '🔁',
    check: (s) => s.counters.reviews >= 25 },
];

export function evaluateBadges(s: AppState, lib: Library): string[] {
  return BADGES.filter((b) => b.check(s, lib)).map((b) => b.id);
}
