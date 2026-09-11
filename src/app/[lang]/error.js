'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { useT } from '@/components/i18n/LocaleProvider';

export default function Error({ error, reset }) {
  const t = useT();
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-[calc(100dvh-var(--nav-h))] bg-surface flex items-center justify-center px-6">
      <div className="animate-fade-in-up max-w-md w-full text-center">
        <p className="text-xs font-bold tracking-widest text-neutral-400 uppercase mb-6">
          {t('error.label')}
        </p>

        <div className="font-mono font-bold tracking-tight mb-8 text-5xl md:text-6xl leading-none">
          <span className="text-neutral-400">f(</span>
          <span className="text-neutral-900">x</span>
          <span className="text-neutral-400">) =</span>
          <br />
          <span className="text-danger-500">undefined</span>
        </div>

        <div className="w-10 h-px bg-neutral-200 mx-auto mb-8" />

        <p className="text-lg font-semibold text-neutral-900 mb-2">{t('error.title')}</p>
        <p className="text-sm text-neutral-500 mb-10 leading-relaxed">{t('error.body')}</p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button onClick={reset} variant="primary">
            {t('error.tryAgain')}
          </Button>
          <Button as={Link} href="/dashboard" variant="outline">
            {t('error.dashboard')}
          </Button>
        </div>
      </div>
    </div>
  );
}
