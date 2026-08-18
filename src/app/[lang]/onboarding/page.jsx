import OnboardingForm from './form';

export default function OnboardingPage() {
  return (
    <div className="min-h-[calc(100dvh-var(--nav-h))] flex items-center justify-center p-4">
      <main className="container max-w-xl mx-auto text-center">
        <h1 className="text-4xl font-extrabold text-primary-600 sm:text-5xl">Choose Your Name!</h1>
        <p className="mt-4 text-lg text-neutral-900">
          This will be your username and you can&apos;t change it!
        </p>
        <div className="mt-8">
          <OnboardingForm />
        </div>
      </main>
    </div>
  );
}
