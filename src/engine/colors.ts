const TEX_HEX: Record<string, string> = {
  primary: '#3b82f6',
  accent: '#a855f7',
  success: '#58cc02',
  danger: '#ef4444',
  warning: '#f59e0b',
  neutral: '#94a3b8',
};

const TOKENS: Record<string, string> = Object.fromEntries(
  Object.keys(TEX_HEX).map((name) => [name, `var(--scene-${name})`])
);

const TOKEN_OF_HEX: Record<string, string> = Object.fromEntries(
  Object.entries(TEX_HEX).map(([name, hex]) => [hex, TOKENS[name]])
);

export function resolveColor(c?: string): string {
  if (!c) return TOKENS.primary;
  return TOKENS[c] ?? c;
}

// katex only takes a literal colour, so tokens go in as hex and come back out
// of the rendered markup as the theme variable
export function texColors(src: string): string {
  return src.replace(/\\(textcolor|color)\{([a-z]+)\}/g, (whole, cmd: string, name: string) =>
    TEX_HEX[name] ? `\\${cmd}{${TEX_HEX[name]}}` : whole
  );
}

export function themeTex(html: string): string {
  return html
    .replace(/mathcolor="(#[0-9a-f]{6})"/g, (whole, hex: string) =>
      TOKEN_OF_HEX[hex] ? `style="color:${TOKEN_OF_HEX[hex]}"` : whole
    )
    .replace(/color:(#[0-9a-f]{6})/g, (whole, hex: string) =>
      TOKEN_OF_HEX[hex] ? `color:${TOKEN_OF_HEX[hex]}` : whole
    );
}

export const GRID_LINE = 'var(--color-neutral-100)';
export const AXIS_LINE = 'var(--color-neutral-400)';
export const AXIS_LABEL = 'var(--color-neutral-600)';
export const AXIS_LABEL_SIZE = 13.5;
export const AXIS_LABEL_WEIGHT = 600;
export const LABEL_HALO = 'var(--color-card)';

export const STROKE = { hero: 3.5, data: 3, aux: 2.5, hairline: 1.5 };
export const SHAPE_FILL_OPACITY = 0.15;
export const SHAPE_STROKE_WIDTH = 1.5;

export function dash(style?: string): string | undefined {
  if (style === 'dashed') return '7 6';
  if (style === 'dotted') return '0.01 7';
  return undefined;
}
