export const USERNAME_MIN = 3;
export const USERNAME_MAX = 39;

export const USERNAME_REGEX = /^[a-z0-9][a-z0-9-]{1,37}[a-z0-9]$/;

export type UsernameProblem = 'empty' | 'short' | 'long' | 'shape';

export function usernameProblem(value: string): UsernameProblem | null {
  const name = value.trim();
  if (!name) return 'empty';
  if (name.length < USERNAME_MIN) return 'short';
  if (name.length > USERNAME_MAX) return 'long';
  if (!USERNAME_REGEX.test(name)) return 'shape';
  return null;
}

export function isValidUsername(value: string): boolean {
  return usernameProblem(value) === null;
}

export function suggestUsername(email: string): string {
  const local = (email.split('@')[0] ?? '').toLowerCase();
  const cleaned = local.replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '');
  if (cleaned.length >= USERNAME_MIN) return cleaned.slice(0, USERNAME_MAX);
  return '';
}
