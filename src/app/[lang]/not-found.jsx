import Link from 'next/link';
import Button from '@/components/ui/Button';
import { getT } from '@/lib/i18n/server';

export const metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

export default async function NotFound() {
  const t = await getT();
  return (
    <div className="min-h-[calc(100dvh-var(--nav-h))] bg-surface flex items-center justify-center px-6">
      <div className="animate-fade-in-up max-w-md w-full text-center">
        <p className="text-xs font-bold tracking-widest text-neutral-400 uppercase mb-6">404</p>

        <div className="font-mono font-bold tracking-tight mb-8 text-5xl md:text-6xl leading-none">
          <span className="text-neutral-400">f(</span>
          <span className="text-neutral-900">404</span>
          <span className="text-neutral-400">) =</span>
          <br />
          <span className="text-primary-500">undefined</span>
        </div>

        <div className="w-10 h-px bg-neutral-200 mx-auto mb-8" />

        <p className="text-lg font-semibold text-neutral-900 mb-2">{t('notFound.title')}</p>
        <p className="text-sm text-neutral-500 mb-10 leading-relaxed">{t('notFound.body')}</p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button as={Link} href="/courses" variant="primary">
            {t('notFound.browse')}
          </Button>
          <Button as={Link} href="/" variant="outline">
            {t('notFound.home')}
          </Button>
        </div>
      </div>
    </div>
  );
}
