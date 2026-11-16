// Calendar days in local time as "YYYY-MM-DD". Day arithmetic goes through UTC dates,
// so daylight-saving changes and travel never produce half days.

export type DayKey = string;

export function dayKey(d: Date = new Date()): DayKey {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toUtc(key: DayKey): number {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

/** Whole calendar days from a to b (b - a). */
export function daysBetween(a: DayKey, b: DayKey): number {
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

export function addDays(key: DayKey, n: number): DayKey {
  const t = new Date(toUtc(key) + n * 86_400_000);
  const y = t.getUTCFullYear();
  const m = String(t.getUTCMonth() + 1).padStart(2, '0');
  const d = String(t.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isDayKey(v: unknown): v is DayKey {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
export function weekdayShort(key: DayKey): string {
  return WEEKDAYS[new Date(toUtc(key)).getUTCDay()] ?? '';
}
