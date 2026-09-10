import { describe, it, expect } from 'vitest';
import {
  usernameProblem,
  isValidUsername,
  suggestUsername,
  USERNAME_MIN,
  USERNAME_MAX,
} from '@/lib/username';

describe('the username rule is one rule', () => {
  it('rejects anything under the minimum, which the client used to accept', () => {
    expect(usernameProblem('a')).toBe('short');
    expect(usernameProblem('ab')).toBe('short');
    expect(isValidUsername('ab')).toBe(false);
  });

  it('accepts the minimum', () => {
    expect(usernameProblem('abc')).toBeNull();
    expect('abc'.length).toBe(USERNAME_MIN);
  });

  it('accepts the maximum and refuses one more', () => {
    expect(usernameProblem('a'.repeat(USERNAME_MAX))).toBeNull();
    expect(usernameProblem('a'.repeat(USERNAME_MAX + 1))).toBe('long');
  });

  it('requires something', () => {
    expect(usernameProblem('   ')).toBe('empty');
  });

  it('refuses a leading or trailing hyphen', () => {
    expect(usernameProblem('-abc')).toBe('shape');
    expect(usernameProblem('abc-')).toBe('shape');
  });

  it('allows a hyphen in the middle', () => {
    expect(usernameProblem('a-b')).toBeNull();
  });

  it('refuses uppercase and spaces', () => {
    expect(usernameProblem('Abc')).toBe('shape');
    expect(usernameProblem('a b')).toBe('shape');
  });
});

describe('suggestUsername', () => {
  it('derives one from the email local part', () => {
    expect(suggestUsername('layla.hassan@example.com')).toBe('laylahassan');
  });

  it('lowercases and strips what the rule forbids', () => {
    expect(suggestUsername('Layla_Hassan+tag@example.com')).toBe('laylahassantag');
  });

  it('never suggests something the rule would reject', () => {
    for (const email of ['ab@x.com', 'a@x.com', '__@x.com', '-@x.com']) {
      const suggestion = suggestUsername(email);
      if (suggestion) expect(isValidUsername(suggestion), email).toBe(true);
    }
  });

  it('gives up rather than suggest something too short', () => {
    expect(suggestUsername('ab@example.com')).toBe('');
  });

  it('truncates a very long local part to something valid', () => {
    const suggestion = suggestUsername(`${'a'.repeat(80)}@example.com`);
    expect(isValidUsername(suggestion)).toBe(true);
  });
});
