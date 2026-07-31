export const metadata = { title: 'Offline' };

export default function OfflinePage() {
  return (
    <main className="flex min-h-[calc(100dvh-var(--nav-h))] items-center justify-center bg-surface px-6">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight text-neutral-900">
          You are offline.
        </h1>
        <p className="mt-3 text-neutral-500">
          Mathly needs a connection to load lessons and save what you have learned. Reconnect and
          this page will pick right back up.
        </p>
      </div>
    </main>
  );
}
