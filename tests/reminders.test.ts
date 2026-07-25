import { describe, it, expect } from 'vitest';
import {
  isEligible,
  reminderFor,
  pickReminders,
  reminderBody,
  type ReminderCandidate,
} from '@/lib/reminders';

const user = (over: Partial<ReminderCandidate> = {}): ReminderCandidate => ({
  id: 'u1',
  email: 'a@b.com',
  name: 'Ada Lovelace',
  emailVerified: true,
  reminderEmails: true,
  streak: 5,
  lastActiveDaysAgo: 1,
  ...over,
});

describe('eligibility', () => {
  it('accepts a verified, opted-in, previously active user', () => {
    expect(isEligible(user())).toBe(true);
  });

  it('never emails someone who opted out', () => {
    expect(isEligible(user({ reminderEmails: false }))).toBe(false);
    expect(reminderFor(user({ reminderEmails: false }))).toBeNull();
  });

  it('never emails an unverified address', () => {
    expect(isEligible(user({ emailVerified: false }))).toBe(false);
    expect(reminderFor(user({ emailVerified: false }))).toBeNull();
  });

  it('never emails someone who has never done anything', () => {
    expect(isEligible(user({ lastActiveDaysAgo: null }))).toBe(false);
    expect(reminderFor(user({ lastActiveDaysAgo: null }))).toBeNull();
  });
});

describe('which reminder fires', () => {
  it('warns when a live streak is one day from lapsing', () => {
    const r = reminderFor(user({ streak: 6, lastActiveDaysAgo: 1 }));
    expect(r?.reason).toBe('streak-at-risk');
    expect(r?.subject).toContain('6-day streak');
  });

  it('stays quiet on a day the user has already practised', () => {
    expect(reminderFor(user({ lastActiveDaysAgo: 0 }))).toBeNull();
  });

  it('stays quiet one day after a lapse with no streak to protect', () => {
    expect(reminderFor(user({ streak: 0, lastActiveDaysAgo: 1 }))).toBeNull();
  });

  it('nudges a lapsed user after three days', () => {
    expect(reminderFor(user({ streak: 0, lastActiveDaysAgo: 3 }))?.reason).toBe('come-back');
  });

  it('stays quiet at two days, before the come-back window opens', () => {
    expect(reminderFor(user({ streak: 0, lastActiveDaysAgo: 2 }))).toBeNull();
  });

  it('gives up after two weeks instead of nagging forever', () => {
    expect(reminderFor(user({ streak: 0, lastActiveDaysAgo: 14 }))?.reason).toBe('come-back');
    expect(reminderFor(user({ streak: 0, lastActiveDaysAgo: 15 }))).toBeNull();
    expect(reminderFor(user({ streak: 0, lastActiveDaysAgo: 400 }))).toBeNull();
  });

  it('sends at most one reminder per user', () => {
    const picked = pickReminders([user({ id: 'a' }), user({ id: 'b', lastActiveDaysAgo: 5 })]);
    expect(picked).toHaveLength(2);
    expect(new Set(picked.map((r) => r.userId)).size).toBe(2);
  });

  it('drops everyone ineligible from a mixed batch', () => {
    const picked = pickReminders([
      user({ id: 'ok' }),
      user({ id: 'optedout', reminderEmails: false }),
      user({ id: 'unverified', emailVerified: false }),
      user({ id: 'today', lastActiveDaysAgo: 0 }),
      user({ id: 'ancient', lastActiveDaysAgo: 90 }),
    ]);
    expect(picked.map((r) => r.userId)).toEqual(['ok']);
  });
});

describe('the email body', () => {
  it('always carries a way to turn reminders off', () => {
    const r = reminderFor(user())!;
    const html = reminderBody(r, 'Ada', 'https://mathly.test');
    expect(html).toContain('https://mathly.test/settings');
    expect(html).toMatch(/turn reminders off/i);
  });

  it('greets by first name and links the dashboard', () => {
    const html = reminderBody(reminderFor(user())!, 'Ada', 'https://mathly.test');
    expect(html).toContain('Ada');
    expect(html).toContain('https://mathly.test/dashboard');
  });
});
