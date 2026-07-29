import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TIMEZONE,
  addDays,
  dayKeyOf,
  dayStart,
  daysBetween,
  isValidTimeZone,
  localDayKey,
  localDayStart,
  localHour,
  normalizeTimeZone,
} from '@/lib/timezone';

describe('isValidTimeZone', () => {
  it('accepts real IANA zones', () => {
    for (const tz of ['UTC', 'Europe/London', 'Pacific/Kiritimati', 'Pacific/Niue', 'Asia/Kolkata'])
      expect(isValidTimeZone(tz), tz).toBe(true);
  });

  it('rejects anything else', () => {
    for (const tz of ['', 'Mars/Olympus', 'GMT+25', null, undefined, 42, {}])
      expect(isValidTimeZone(tz), String(tz)).toBe(false);
  });

  it('falls back to UTC rather than throwing', () => {
    expect(normalizeTimeZone('Mars/Olympus')).toBe(DEFAULT_TIMEZONE);
    expect(normalizeTimeZone(null)).toBe(DEFAULT_TIMEZONE);
    expect(normalizeTimeZone('Asia/Tokyo')).toBe('Asia/Tokyo');
  });
});

describe('localDayKey', () => {
  const at = new Date('2026-07-26T11:30:00.000Z');

  it('is ISO ordered', () => {
    expect(localDayKey('UTC', at)).toBe('2026-07-26');
  });

  it('puts the far east on tomorrow and the far west on yesterday', () => {
    const lateUtc = new Date('2026-07-26T23:30:00.000Z');
    expect(localDayKey('Pacific/Kiritimati', lateUtc)).toBe('2026-07-27');
    expect(localDayKey('UTC', lateUtc)).toBe('2026-07-26');

    const earlyUtc = new Date('2026-07-26T02:00:00.000Z');
    expect(localDayKey('Pacific/Niue', earlyUtc)).toBe('2026-07-25');
  });

  it('treats a null zone as UTC', () => {
    expect(localDayKey(null, at)).toBe(localDayKey('UTC', at));
    expect(localDayKey(undefined, at)).toBe(localDayKey('UTC', at));
  });

  it('survives a DST boundary, which naive offset arithmetic would not', () => {
    const beforeSpringForward = new Date('2026-03-08T06:59:00.000Z');
    const afterSpringForward = new Date('2026-03-08T07:01:00.000Z');
    expect(localDayKey('America/New_York', beforeSpringForward)).toBe('2026-03-08');
    expect(localDayKey('America/New_York', afterSpringForward)).toBe('2026-03-08');

    const nyEvening = new Date('2026-03-09T03:30:00.000Z');
    expect(localDayKey('America/New_York', nyEvening)).toBe('2026-03-08');
  });

  it('rolls over at the user midnight, not the utc one', () => {
    const justBefore = new Date('2026-07-26T13:59:00.000Z');
    const justAfter = new Date('2026-07-26T14:01:00.000Z');
    expect(localDayKey('Pacific/Auckland', justBefore)).toBe('2026-07-27');
    expect(localDayKey('Pacific/Auckland', justAfter)).toBe('2026-07-27');

    const aucklandMidnight = new Date('2026-07-26T12:01:00.000Z');
    expect(localDayKey('Pacific/Auckland', aucklandMidnight)).toBe('2026-07-27');
    expect(localDayKey('UTC', aucklandMidnight)).toBe('2026-07-26');
  });
});

describe('day arithmetic', () => {
  it('stores a local day as utc midnight so @db.Date round trips', () => {
    const d = localDayStart('Pacific/Auckland', new Date('2026-07-26T12:01:00.000Z'));
    expect(d.toISOString()).toBe('2026-07-27T00:00:00.000Z');
    expect(dayKeyOf(d)).toBe('2026-07-27');
  });

  it('walks backwards across a month boundary', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
  });

  it('walks forwards too', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-07-26', 7)).toBe('2026-08-02');
  });

  it('counts whole days between keys', () => {
    expect(daysBetween('2026-07-26', '2026-07-26')).toBe(0);
    expect(daysBetween('2026-07-25', '2026-07-26')).toBe(1);
    expect(daysBetween('2026-07-26', '2026-07-25')).toBe(-1);
    expect(daysBetween('2026-02-26', '2026-03-05')).toBe(7);
  });

  it('is unaffected by DST, because keys are plain calendar dates', () => {
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
  });

  it('round trips a key through dayStart', () => {
    expect(dayKeyOf(dayStart('2026-07-26'))).toBe('2026-07-26');
  });
});

describe('localHour', () => {
  const at = new Date('2026-07-29T12:00:00.000Z');

  it('reads the wall-clock hour in the given zone', () => {
    expect(localHour('UTC', at)).toBe(12);
    expect(localHour('Europe/London', at)).toBe(13);
    expect(localHour('Africa/Cairo', at)).toBe(15);
    expect(localHour('America/New_York', at)).toBe(8);
  });

  it('wraps midnight to 0, never 24', () => {
    expect(localHour('UTC', new Date('2026-07-29T00:30:00.000Z'))).toBe(0);
  });

  it('falls back to the default zone for junk input', () => {
    expect(localHour('Not/AZone', at)).toBe(localHour(undefined, at));
  });
});
