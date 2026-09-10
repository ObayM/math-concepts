import Banner from '@/components/ui/Banner';
import { getLocale, getT } from '@/lib/i18n/server';
import { supportEmail } from '@/lib/support';

export default async function BetaBanner({ className = '' }) {
  const locale = await getLocale();
  if (locale !== 'ar') return null;

  const t = await getT();
  const mailto = `mailto:${supportEmail()}?subject=${encodeURIComponent('Arabic lessons')}`;

  return (
    <Banner
      className={className}
      title={t('beta.title')}
      action={
        <a href={mailto} className="text-primary-600 underline hover:no-underline">
          {t('beta.notify')}
        </a>
      }
    >
      {t('beta.body')}
    </Banner>
  );
}
