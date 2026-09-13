import OnboardingForm from './form';
import { getT } from '@/lib/i18n/server';

export default async function OnboardingPage() {
  const t = await getT();
  return (
    <div className="min-h-[calc(100dvh-var(--nav-h))] flex items-center justify-center p-4 ">
      <main className="container max-w-xl mx-auto text-center">
        <h1 className="text-4xl font-extrabold text-primary-600 sm:text-5xl">
          {t('onboarding.title')}
        </h1>
        <p className="mt-4 text-lg text-neutral-900">{t('onboarding.blurb')}</p>
        <div className="mt-8">
          <OnboardingForm />
        </div>
      </main>
    </div>
  );
}
