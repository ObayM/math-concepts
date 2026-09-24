export const COLOR_TOKENS = [
  'primary',
  'accent',
  'success',
  'danger',
  'warning',
  'neutral',
] as const;

export type ColorToken = (typeof COLOR_TOKENS)[number];

export type Roles = Record<string, ColorToken>;

const isToken = (c: string): c is ColorToken => (COLOR_TOKENS as readonly string[]).includes(c);

export const SPAN = /\[([^\]\n]+)\]\{([a-z][\w-]*)(?::([a-z][\w-]*))?\}/g;
const TEX_COLOR = /\\(textcolor|color)\{([a-z][\w-]*)\}/g;

export function applyRoles(text: string, roles: Roles, onUnknown: (name: string) => void): string {
  return text
    .replace(SPAN, (whole, body: string, name: string, tagged?: string) => {
      if (tagged) return whole;
      if (roles[name]) return `[${body}]{${roles[name]}:${name}}`;
      if (isToken(name)) return whole;
      onUnknown(name);
      return whole;
    })
    .replace(TEX_COLOR, (whole, cmd: string, name: string) =>
      roles[name] ? `\\${cmd}{${roles[name]}}` : whole
    );
}

export function roleColor(name: string | undefined, roles: Roles): string | undefined {
  if (!name) return name;
  return roles[name] ?? name;
}

export function isColorToken(c: string): boolean {
  return isToken(c);
}
