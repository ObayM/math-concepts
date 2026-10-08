export const EVENT_TYPES = [
  'lesson_open',
  'lesson_close',
  'slide_enter',
  'slide_leave',
  'check',
  'hint',
  'show_me',
  'back',
  'next',
  'hidden',
  'visible',
  'idle',
  'active',
  'tutor_open',
  'tutor_ask',
  'complete',
  'reset',
  'skip',
  'jump',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const IDLE_MS = 120_000;
export const MAX_BATCH = 50;
export const MAX_BUFFER = 500;
export const CONTROL_TICK_MS = 500;
export const RETENTION_DAYS = 90;

const DAY_MS = 86_400_000;
const FUTURE_SLACK_MS = 60_000;

export type Dwell = { startedAt: number; since: number | null; activeMs: number };

export function startDwell(now: number): Dwell {
  return { startedAt: now, since: now, activeMs: 0 };
}

export function pauseDwell(d: Dwell, at: number): Dwell {
  if (d.since === null) return d;
  return { ...d, since: null, activeMs: d.activeMs + Math.max(0, at - d.since) };
}

export function resumeDwell(d: Dwell, at: number): Dwell {
  return d.since === null ? { ...d, since: at } : d;
}

export function readDwell(d: Dwell, now: number): { activeMs: number; wallMs: number } {
  const open = d.since === null ? 0 : Math.max(0, now - d.since);
  return {
    activeMs: Math.round(d.activeMs + open),
    wallMs: Math.round(Math.max(0, now - d.startedAt)),
  };
}

// reading a slide without touching anything is normal, so the whole grace
// window counts as active and only the time after it is cut
export function idleSince(lastInput: number, now: number): number | null {
  return now - lastInput >= IDLE_MS ? lastInput + IDLE_MS : null;
}

export function clampClientTime(t: number, now: number): number {
  return Math.min(now + FUTURE_SLACK_MS, Math.max(now - DAY_MS, t));
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
