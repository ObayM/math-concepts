export const THEMES = ['light', 'dark', 'system'] as const;
export type ThemePref = (typeof THEMES)[number];
export type Theme = 'light' | 'dark';

export const THEME_COOKIE = 'mathly-theme';

export const THEME_COLOR: Record<Theme, string> = {
  light: '#ffffff',
  dark: '#0b0f17',
};

export function parseTheme(value: unknown): ThemePref {
  return THEMES.includes(value as ThemePref) ? (value as ThemePref) : 'system';
}

export function resolveTheme(pref: ThemePref, prefersDark: boolean): Theme {
  if (pref === 'system') return prefersDark ? 'dark' : 'light';
  return pref;
}

export function themeCookie(
  pref: ThemePref,
  { domain = '', secure = false }: { domain?: string; secure?: boolean } = {}
): string {
  return [
    `${THEME_COOKIE}=${pref}`,
    'Path=/',
    'Max-Age=31536000',
    'SameSite=Lax',
    domain && `Domain=${domain}`,
    secure && 'Secure',
  ]
    .filter(Boolean)
    .join('; ');
}

// runs before first paint, so it has to stand alone: no imports, no react
export const SYSTEM_THEME_SCRIPT = `try{document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch(e){}`;
