'use client';

import { useT } from '@/components/i18n/LocaleProvider';
import { useTheme } from '@/components/theme/ThemeProvider';
import { THEME_OPTIONS } from '@/components/theme/ThemeToggle';

export default function ThemeSwitcher() {
  const t = useT();
  const { pref, setPref } = useTheme();

  return (
    <div>
      <h2 className="text-lg font-bold text-neutral-900">{t('settings.theme')}</h2>
      <p className="mt-1 text-sm text-neutral-500">{t('settings.themeBlurb')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {THEME_OPTIONS.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setPref(value)}
            aria-pressed={value === pref}
            className={`inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 text-sm font-bold transition-colors ${
              value === pref
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {t(label)}
          </button>
        ))}
      </div>
    </div>
  );
}
