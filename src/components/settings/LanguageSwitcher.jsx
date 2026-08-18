'use client';

import { useState } from 'react';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { LOCALES } from '@/lib/locale';

const LABELS = { en: 'English', ar: 'العربية' };

// the react compiler forbids touching window from inside the component body
function goTo(url) {
  window.location.href = url;
}

export default function LanguageSwitcher({ originFor, heading, blurb }) {
  const current = useLocale();
  const [busy, setBusy] = useState(null);

  async function choose(next) {
    if (next === current || busy) return;
    setBusy(next);
    try {
      await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ locale: next }),
      });
    } catch {
      // the hop still works without the saved preference
    }
    const target = originFor?.[next];
    if (target) goTo(`${target}/settings`);
    else setBusy(null);
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-neutral-900">{heading}</h2>
      <p className="mt-1 text-sm text-neutral-500">{blurb}</p>
      <div className="mt-3 flex gap-2">
        {LOCALES.map((code) => (
          <button
            key={code}
            type="button"
            lang={code}
            onClick={() => choose(code)}
            disabled={Boolean(busy)}
            aria-pressed={code === current}
            className={`rounded-xl border-2 px-4 py-2 text-sm font-bold transition-colors ${
              code === current
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
            } ${busy ? 'opacity-60' : ''}`}
          >
            {busy === code ? '...' : LABELS[code]}
          </button>
        ))}
      </div>
    </div>
  );
}
