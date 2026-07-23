const TOKENS: Record<string, string> = {
  primary: '#3b82f6',
  accent: '#a855f7',
  success: '#58cc02',
  danger: '#ef4444',
  warning: '#f59e0b',
  neutral: '#94a3b8',
};

export function resolveColor(c?: string): string {
  if (!c) return '#3b82f6';
  return TOKENS[c] ?? c;
}

export const GRID_LINE = 'var(--color-neutral-100)';
export const AXIS_LINE = 'var(--color-neutral-300)';
export const AXIS_LABEL = 'var(--color-neutral-400)';

export function dash(style?: string): string | undefined {
  if (style === 'dashed') return '8 6';
  if (style === 'dotted') return '2 5';
  return undefined;
}
