import Link from 'next/link';
import { getLocale, getT } from '@/lib/i18n/server';
import { LOCALES } from '@/lib/locale';
import { hasLocaleOrigins, originForLocale } from '@/lib/origin';

export default async function Footer() {
  const t = await getT();
  const locale = await getLocale();
  const other = LOCALES.find((l) => l !== locale);

  const links = [
    { href: '/courses', label: t('nav.courses') },
    { href: '/prism', label: t('footer.prism') },
    { href: '/privacy', label: t('footer.privacy') },
    { href: '/terms', label: t('footer.terms') },
  ];

  return (
    <footer className="border-t border-neutral-200/70 bg-card/60">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-sm text-neutral-400">{t('footer.tagline')}</p>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="tap-target-halo tap-target-h flex items-center text-sm text-neutral-400 transition-colors hover:text-primary-600"
            >
              {link.label}
            </Link>
          ))}
          {hasLocaleOrigins && other && (
            <a
              href={originForLocale(other)}
              lang={other}
              aria-label={t('lang.switchLabel')}
              className="tap-target-halo tap-target-h flex items-center text-sm font-semibold text-neutral-500 transition-colors hover:text-primary-600"
            >
              {t('lang.switch')}
            </a>
          )}
        </nav>
      </div>
    </footer>
  );
}
