export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

export function passwordProblem(password: string): 'short' | 'long' | null {
  if (password.length < PASSWORD_MIN) return 'short';
  if (password.length > PASSWORD_MAX) return 'long';
  return null;
}
