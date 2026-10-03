'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import { THEME_COLOR, resolveTheme, themeCookie } from '@/lib/theme';

const QUERY = '(prefers-color-scheme: dark)';

const ThemeContext = createContext({ pref: 'system', setPref: () => {} });

function apply(pref) {
  const root = document.documentElement;
  const theme = resolveTheme(pref, matchMedia(QUERY).matches);
  if (root.dataset.theme === theme) return;

  // without this every transition-colors element fades on its own clock and
  // the page swaps theme in a ripple instead of at once
  const freeze = document.createElement('style');
  freeze.textContent = '*,*::before,*::after{transition:none!important}';
  document.head.appendChild(freeze);
  root.dataset.theme = theme;
  getComputedStyle(root).colorScheme;
  requestAnimationFrame(() => freeze.remove());
}

function paintThemeColor(pref) {
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    const own = meta.media.includes('dark') ? 'dark' : 'light';
    meta.content = THEME_COLOR[pref === 'system' ? own : pref];
  }
}

function saveCookie(pref, domain) {
  document.cookie = themeCookie(pref, { domain, secure: location.protocol === 'https:' });
}

export function ThemeProvider({ initialPref, cookieDomain, children }) {
  const [pref, setPrefState] = useState(initialPref);

  useEffect(() => {
    apply(pref);
    paintThemeColor(pref);
    if (pref !== 'system') return;
    const mq = matchMedia(QUERY);
    const follow = () => apply('system');
    mq.addEventListener('change', follow);
    return () => mq.removeEventListener('change', follow);
  }, [pref]);

  const setPref = useCallback(
    (next) => {
      saveCookie(next, cookieDomain);
      setPrefState(next);
    },
    [cookieDomain]
  );

  return <ThemeContext.Provider value={{ pref, setPref }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

function subscribe(onChange) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

export function useResolvedTheme() {
  return useSyncExternalStore(
    subscribe,
    () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'),
    () => 'light'
  );
}
