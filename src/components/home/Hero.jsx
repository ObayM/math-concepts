'use client';

import { useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/components/auth/AuthProvider';
import { useT } from '@/components/i18n/LocaleProvider';

export default function Hero() {
  const t = useT();
  const { user } = useAuth();
  const heroRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    const el = heroRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    el.style.setProperty('--my', `${e.clientY - rect.top}px`);
  }, []);

  return (
    <section
      ref={heroRef}
      onMouseMove={handleMouseMove}
      className="bg-grid-interactive text-neutral-900"
    >
      <div className="container mx-auto px-6 pt-28 pb-20 md:pt-40 md:pb-28">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="animate-fade-in-up [animation-delay:100ms] opacity-0 font-display text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            {t('home.heroLead')} <span className="text-primary-600">{t('home.heroAccent')}</span>
          </h1>

          <p className="animate-fade-in-up [animation-delay:200ms] opacity-0 mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-neutral-500 md:text-xl">
            {t('home.heroBlurb')}
          </p>

          <div className="animate-fade-in-up [animation-delay:300ms] opacity-0 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {user ? (
              <Button as={Link} href="/dashboard" size="lg">
                {t('home.continue')}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1 rtl:rotate-180" />
              </Button>
            ) : (
              <>
                <Button as={Link} href="/signup" size="lg">
                  {t('home.startFree')}
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1 rtl:rotate-180" />
                </Button>
                <Button as={Link} href="/login" variant="outline" size="lg">
                  {t('home.logIn')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
