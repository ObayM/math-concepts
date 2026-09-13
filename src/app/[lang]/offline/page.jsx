import { getT } from '@/lib/i18n/server';

export async function generateMetadata() {
  const t = await getT();
  return { title: t('offline.title') };
}

export default async function OfflinePage() {
  const t = await getT();
  return (
    <main className="flex min-h-[calc(100dvh-var(--nav-h))] items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight text-neutral-900">
          {t('offline.title')}
        </h1>
        <p className="mt-3 text-neutral-500">{t('offline.body')}</p>
      </div>
    </main>
  );
}
