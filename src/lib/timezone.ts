export const DEFAULT_TIMEZONE = 'UTC';

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz) return false;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimeZone(tz: unknown): string {
  return isValidTimeZone(tz) ? tz : DEFAULT_TIMEZONE;
}

export function localDayKey(timezone?: string | null, at: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: normalizeTimeZone(timezone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

export function dayKeyOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dayStart(dayKey: string): Date {
  return new Date(`${dayKey}T00:00:00.000Z`);
}

export function localDayStart(timezone?: string | null, at: Date = new Date()): Date {
  return dayStart(localDayKey(timezone, at));
}

export function addDays(dayKey: string, delta: number): string {
  const d = dayStart(dayKey);
  d.setUTCDate(d.getUTCDate() + delta);
  return dayKeyOf(d);
}

export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((dayStart(toKey).getTime() - dayStart(fromKey).getTime()) / 86_400_000);
}
