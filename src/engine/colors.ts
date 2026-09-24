const TOKENS: Record<string, string> = {
  primary: '#3b82f6',
  accent: '#a855f7',
  success: '#58cc02',
  danger: '#ef4444',
  warning: '#f59e0b',
  neutral: '#94a3b8',
};

export function resolveColor(c?: string): string {
  if (!c) return TOKENS.primary;
  return TOKENS[c] ?? c;
}

export function texColors(src: string): string {
  return src.replace(/\\(textcolor|color)\{([a-z]+)\}/g, (whole, cmd: string, name: string) =>
    TOKENS[name] ? `\\${cmd}{${TOKENS[name]}}` : whole
  );
}

export const GRID_LINE = 'var(--color-neutral-100)';
export const AXIS_LINE = 'var(--color-neutral-400)';
export const AXIS_LABEL = 'var(--color-neutral-600)';
export const AXIS_LABEL_SIZE = 13.5;
export const AXIS_LABEL_WEIGHT = 600;
export const LABEL_HALO = 'white';

export const STROKE = { hero: 3.5, data: 3, aux: 2.5, hairline: 1.5 };
export const SHAPE_FILL_OPACITY = 0.15;
export const SHAPE_STROKE_WIDTH = 1.5;

export function dash(style?: string): string | undefined {
  if (style === 'dashed') return '7 6';
  if (style === 'dotted') return '0.01 7';
  return undefined;
}
