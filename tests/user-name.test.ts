import { describe, it, expect } from 'vitest';
import { displayName, firstName, nameProblem, NAME_MAX } from '@/lib/user-name';

describe('displayName', () => {
  it('uses a real name', () => {
    expect(displayName({ name: 'Layla Hassan', email: 'l@x.com' })).toBe('Layla Hassan');
  });

  it('never greets someone by their email address', () => {
    const legacy = { name: 'someone@example.com', email: 'someone@example.com', username: 'sam' };
    expect(displayName(legacy)).toBe('sam');
  });

  it('catches the case where name equals email without an at sign in view', () => {
    const legacy = { name: 'weird', email: 'weird', username: 'sam' };
    expect(displayName(legacy)).toBe('sam');
  });

  it('prefers the display username over the plain one', () => {
    const user = { name: 'a@b.com', email: 'a@b.com', displayUsername: 'Sam', username: 'sam' };
    expect(displayName(user)).toBe('Sam');
  });

  it('falls back when a legacy row has nothing usable', () => {
    expect(displayName({ name: 'a@b.com', email: 'a@b.com' })).toBe('there');
  });

  it('treats whitespace as absent', () => {
    expect(displayName({ name: '   ', username: 'sam' })).toBe('sam');
  });

  it('handles a missing user', () => {
    expect(displayName(null)).toBe('there');
    expect(displayName(undefined, 'friend')).toBe('friend');
  });

  it('keeps arabic names intact', () => {
    expect(displayName({ name: 'ليلى حسن', email: 'l@x.com' })).toBe('ليلى حسن');
  });
});

describe('firstName', () => {
  it('takes the first word', () => {
    expect(firstName({ name: 'Layla Hassan', email: 'l@x.com' })).toBe('Layla');
  });

  it('does not split an email into nonsense', () => {
    expect(
      firstName({ name: 'someone@example.com', email: 'someone@example.com', username: 'sam' })
    ).toBe('sam');
  });
});

describe('nameProblem', () => {
  it('requires something', () => {
    expect(nameProblem('  ')).toBe('empty');
  });

  it('caps the length', () => {
    expect(nameProblem('x'.repeat(NAME_MAX + 1))).toBe('long');
  });

  it('accepts any script', () => {
    expect(nameProblem('ليلى')).toBeNull();
    expect(nameProblem('Zoë')).toBeNull();
  });
});
