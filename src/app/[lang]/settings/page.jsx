import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { getUserSettings } from '@/lib/db/userService';
import SettingsForm from './SettingsForm';
import LanguageSwitcher from '@/components/settings/LanguageSwitcher';
import { getT } from '@/lib/i18n/server';
import { LOCALES } from '@/lib/locale';
import { originForLocale } from '@/lib/origin';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const user = await requireUser();
  if (!user) redirect('/login');

  const settings = await getUserSettings(user.id);
  if (!settings) redirect('/login');

  const t = await getT();
  const originFor = Object.fromEntries(LOCALES.map((l) => [l, originForLocale(l)]));

  return (
    <div className="bg-app -mt-[var(--nav-h)] min-h-dvh pt-[var(--nav-h)]">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="animate-fade-in-up">
          <h1 className="font-display text-4xl font-bold tracking-tight text-neutral-900">
            Settings
          </h1>
          <p className="mt-2 text-neutral-500">{settings.email}</p>
        </header>
        <div className="mt-8">
          <LanguageSwitcher
            originFor={originFor}
            heading={t('settings.language')}
            blurb={t('settings.languageBlurb')}
          />
        </div>
        <SettingsForm
          reminderEmails={settings.reminderEmails}
          emailVerified={settings.emailVerified}
        />
      </div>
    </div>
  );
}
