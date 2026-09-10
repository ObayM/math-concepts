export const NAME_MAX = 60;

interface NameLike {
  name?: string | null;
  email?: string | null;
  displayUsername?: string | null;
  username?: string | null;
}

function usable(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed ? trimmed : null;
}

export function displayName(user: NameLike | null | undefined, fallback = 'there'): string {
  if (!user) return fallback;

  const name = usable(user.name);
  const email = usable(user.email);
  const looksLikeEmail = name !== null && (name.includes('@') || name === email);

  return (
    (looksLikeEmail ? null : name) ??
    usable(user.displayUsername) ??
    usable(user.username) ??
    fallback
  );
}

export function firstName(user: NameLike | null | undefined, fallback = 'there'): string {
  return displayName(user, fallback).split(/\s+/)[0];
}

export function nameProblem(value: string): 'empty' | 'long' | null {
  const name = value.trim();
  if (!name) return 'empty';
  if (name.length > NAME_MAX) return 'long';
  return null;
}
