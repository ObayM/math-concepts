export const DEFAULT_TIMEZONE = 'UTC';

// not a display locale. en-CA is the one common locale that formats YYYY-MM-DD,
// and this output is a database key (user_daily_activity.activity_date) that
// feeds streaks, the heatmap and the xp cap. localizing it yields arabic-indic
// digits and every downstream `new Date(...)` becomes Invalid Date.
const ISO_DAY_LOCALE = 'en-CA';

// likewise fixed, chosen for hour12: false
const HOUR24_LOCALE = 'en-GB';

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz) return false;
  try {
    new Intl.DateTimeFormat(ISO_DAY_LOCALE, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimeZone(tz: unknown): string {
  return isValidTimeZone(tz) ? tz : DEFAULT_TIMEZONE;
}

export function localDayKey(timezone?: string | null, at: Date = new Date()): string {
  return new Intl.DateTimeFormat(ISO_DAY_LOCALE, {
    timeZone: normalizeTimeZone(timezone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

export function localHour(timezone?: string | null, at: Date = new Date()): number {
  const hour = new Intl.DateTimeFormat(HOUR24_LOCALE, {
    timeZone: normalizeTimeZone(timezone),
    hour: '2-digit',
    hour12: false,
  }).format(at);
  // en-GB renders midnight as 24 in some ICU versions
  return Number(hour) % 24;
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
