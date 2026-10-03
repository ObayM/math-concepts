import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { parseTheme, resolveTheme, themeCookie, THEME_COOKIE } from '@/lib/theme';
import { resolveColor, themeTex, texColors } from '@/engine/colors';
import { compile } from '@/engine/lang';
import { Scene } from '@/engine';

describe('theme preference', () => {
  it('falls back to system for anything it does not know', () => {
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme('system')).toBe('system');
    expect(parseTheme('Dark')).toBe('system');
    expect(parseTheme('')).toBe('system');
    expect(parseTheme(undefined)).toBe('system');
  });

  it('only asks the device when told to follow it', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('writes a cookie the sibling subdomain can read', () => {
    expect(themeCookie('dark')).toBe(
      `${THEME_COOKIE}=dark; Path=/; Max-Age=31536000; SameSite=Lax`
    );
    expect(themeCookie('light', { domain: '.mathly.com', secure: true })).toBe(
      `${THEME_COOKIE}=light; Path=/; Max-Age=31536000; SameSite=Lax; Domain=.mathly.com; Secure`
    );
  });
});

const css = readFileSync('src/app/globals.css', 'utf8');
const block = (selector: string) => {
  const start = css.indexOf(`${selector} {`);
  return css.slice(start, css.indexOf('\n}', start));
};
const names = (src: string, prefix: string) =>
  new Set([...src.matchAll(new RegExp(`(${prefix}[a-z0-9-]+):`, 'g'))].map((m) => m[1]));

// solid fills stay put in dark so a pressed button keeps its darker edge
const SAME_IN_BOTH =
  /^--color-(primary-[4-8]00|success-[4-8]00|danger-[56]00|warning-[56]00|accent-[5-8]00|pair-[1-6])$|^--text-color-success-500$/;

describe('dark palette', () => {
  const theme = block('@theme');
  const dark = block(":root[data-theme='dark']");

  it('decides every colour token, so a new one cannot skip dark by accident', () => {
    const tokens = [...names(theme, '--color-'), ...names(theme, '--text-color-')];
    const undecided = tokens.filter((t) => !SAME_IN_BOTH.test(t) && !dark.includes(`${t}:`));
    expect(undecided).toEqual([]);
  });

  it('only overrides tokens that exist in light', () => {
    const tokens = new Set([...names(theme, '--color-'), ...names(theme, '--text-color-')]);
    const strays = [...names(dark, '--color-'), ...names(dark, '--text-color-')].filter(
      (t) => !tokens.has(t)
    );
    expect(strays).toEqual([]);
  });

  it('gives every scene colour a dark value', () => {
    const light = names(block(':root'), '--scene-');
    expect([...light].sort()).toEqual([...names(dark, '--scene-')].sort());
    expect(light.size).toBe(6);
  });
});

describe('scene colours follow the theme', () => {
  it('resolves tokens to variables and leaves raw css alone', () => {
    expect(resolveColor('accent')).toBe('var(--scene-accent)');
    expect(resolveColor()).toBe('var(--scene-primary)');
    expect(resolveColor('#123456')).toBe('#123456');
  });

  it('swaps the hex katex needs back out for the variable', () => {
    expect(texColors('\\textcolor{danger}{x}')).toBe('\\textcolor{#ef4444}{x}');
    expect(themeTex('<span style="color:#ef4444;">x</span>')).toBe(
      '<span style="color:var(--scene-danger);">x</span>'
    );
    expect(themeTex('<span style="color:#123456;">x</span>')).toBe(
      '<span style="color:#123456;">x</span>'
    );
  });

  it('never paints a literal white into a scene', () => {
    const scene = compile(`scene plane {
      x: [-2, 2]
      y: [-2, 2]
      grid
      axes
      curve f = x^2 { color: accent }
      point p = (1, 1) { label: "P", open }
      label at (1, 1.5) = "y = \\textcolor{danger}{x}^2" { tex, color: primary }
    }`);
    const html = renderToStaticMarkup(createElement(Scene, { ir: scene }));
    expect(html).toContain('var(--scene-accent)');
    expect(html).toContain('color:var(--scene-danger)');
    expect(html).not.toMatch(/"white"|#fff\b|#ffffff|rgba\(255, ?255, ?255/i);
  });
});

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

describe('light-only colours stay out of the app', () => {
  const files = walk('src').filter((f) => /\.(jsx?|tsx?)$/.test(f));

  it('uses bg-card for surfaces, keeping white only for knobs', () => {
    const hits = files.flatMap((f) =>
      readFileSync(f, 'utf8')
        .split('\n')
        .filter((l) => /\bbg-white\b/.test(l))
        .map((l) => `${f}: ${l.trim()}`)
    );
    expect(hits.every((h) => /rounded-full/.test(h))).toBe(true);
    expect(hits.length).toBeLessThanOrEqual(4);
  });

  it('keeps white out of the scene renderers', () => {
    const renderers = files.filter((f) => f.startsWith(join('src', 'engine', 'renderers')));
    const hits = renderers.filter((f) =>
      /['"]white['"]|rgba\(255, ?255, ?255/.test(readFileSync(f, 'utf8'))
    );
    expect(hits).toEqual([]);
  });
});
