import { describe, it, expect } from 'vitest';
import { lessonStatuses } from '@/lib/unlock';

const course = [
  { lessonKey: 'l1' },
  { lessonKey: 'l2' },
  { lessonKey: 'bank', kind: 'bank' },
  { lessonKey: 'l3' },
];

const statuses = (progress: Record<string, { completed?: boolean; currentStep?: number }>) =>
  lessonStatuses(course, (key) => progress[key]);

describe('lessonStatuses', () => {
  it('opens the first lesson and locks the rest', () => {
    expect(statuses({})).toEqual(['unlocked', 'locked', 'locked', 'locked']);
  });

  it('opens a bank together with the lesson after the one it follows', () => {
    expect(statuses({ l1: { completed: true }, l2: { completed: true } })).toEqual([
      'completed',
      'completed',
      'unlocked',
      'unlocked',
    ]);
  });

  it('never lets an unfinished bank hold up the next lesson', () => {
    const s = statuses({
      l1: { completed: true },
      l2: { completed: true },
      bank: { currentStep: 4 },
    });
    expect(s[3]).toBe('unlocked');
  });

  it('does not count a finished bank as the lesson before', () => {
    expect(statuses({ l1: { completed: true }, bank: { completed: true } })).toEqual([
      'completed',
      'unlocked',
      'completed',
      'locked',
    ]);
  });

  it('keeps a started lesson open, and opens everything for an admin', () => {
    expect(statuses({ l3: { currentStep: 2 } })[3]).toBe('unlocked');
    expect(lessonStatuses(course, () => undefined, true)).toEqual([
      'unlocked',
      'unlocked',
      'unlocked',
      'unlocked',
    ]);
  });
});
