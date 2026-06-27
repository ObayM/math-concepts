import OnboardingForm from './form';

export default function OnboardingPage() {
  return (
    <div className="min-h-[calc(100vh-73px)] flex items-center justify-center p-4">
      <main className="container max-w-xl mx-auto text-center">
        <h1 className="text-4xl font-extrabold text-blue-500 sm:text-5xl">Choose Your Name!</h1>
        <p className="mt-4 text-lg text-neutral-900">
          This will be your username and you can&apos;t change it!
        </p>
        <p className="mt-2 text-sm text-neutral-900">
          Your profile will be at: <code>/u/your-name</code>
        </p>
        <div className="mt-8">
          <OnboardingForm />
        </div>
      </main>
    </div>
  );
}
