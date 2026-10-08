import { describe, it, expect } from 'vitest';
import {
  IDLE_MS,
  chunk,
  clampClientTime,
  idleSince,
  pauseDwell,
  readDwell,
  resumeDwell,
  startDwell,
} from '@/lib/tracker-core';

describe('dwell time', () => {
  it('counts wall and active time the same when nothing interrupts', () => {
    expect(readDwell(startDwell(1000), 6000)).toEqual({ activeMs: 5000, wallMs: 5000 });
  });

  it('stops counting active time while paused, but the wall clock keeps going', () => {
    let d = startDwell(0);
    d = pauseDwell(d, 4000);
    d = resumeDwell(d, 10_000);
    expect(readDwell(d, 12_000)).toEqual({ activeMs: 6000, wallMs: 12_000 });
  });

  it('ignores a second pause or a second resume', () => {
    let d = startDwell(0);
    d = pauseDwell(d, 1000);
    d = pauseDwell(d, 5000);
    expect(readDwell(d, 9000).activeMs).toBe(1000);
    d = resumeDwell(d, 9000);
    d = resumeDwell(d, 9500);
    expect(readDwell(d, 10_000).activeMs).toBe(2000);
  });

  it('never goes negative when a pause is backdated before the slide began', () => {
    const d = pauseDwell(startDwell(5000), 2000);
    expect(readDwell(d, 9000)).toEqual({ activeMs: 0, wallMs: 4000 });
  });
});

describe('idle detection', () => {
  it('is not idle inside the grace window', () => {
    expect(idleSince(0, IDLE_MS - 1)).toBeNull();
  });

  it('marks idle from the end of the grace window, not from when it was noticed', () => {
    expect(idleSince(1000, 1000 + IDLE_MS + 4000)).toBe(1000 + IDLE_MS);
  });
});

describe('client clocks', () => {
  const now = 1_700_000_000_000;

  it('keeps a plausible timestamp as it is', () => {
    expect(clampClientTime(now - 30_000, now)).toBe(now - 30_000);
  });

  it('pulls a far future or far past clock back into range', () => {
    expect(clampClientTime(now + 10 * 86_400_000, now)).toBe(now + 60_000);
    expect(clampClientTime(0, now)).toBe(now - 86_400_000);
  });
});

describe('chunk', () => {
  it('splits into fixed size batches with a short tail', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 50)).toEqual([]);
  });
});
