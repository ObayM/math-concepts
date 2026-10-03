'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useT } from '@/components/i18n/LocaleProvider';
import { useTheme } from '@/components/theme/ThemeProvider';

export const THEME_OPTIONS = [
  { value: 'light', icon: Sun, label: 'settings.themeLight' },
  { value: 'dark', icon: Moon, label: 'settings.themeDark' },
  { value: 'system', icon: Monitor, label: 'settings.themeSystem' },
];

export default function ThemeToggle({ className = '' }) {
  const t = useT();
  const { pref, setPref } = useTheme();

  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <span className="text-sm text-neutral-700">{t('nav.theme')}</span>
      <div
        role="group"
        aria-label={t('nav.theme')}
        className="flex rounded-lg bg-neutral-100 p-0.5"
      >
        {THEME_OPTIONS.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setPref(value)}
            aria-pressed={value === pref}
            aria-label={t(label)}
            title={t(label)}
            className={`tap-target flex h-7 w-8 items-center justify-center rounded-md transition-colors ${
              value === pref
                ? 'bg-card text-neutral-900 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-700'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}
