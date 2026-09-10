function Line({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-200/70 ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <Line className="h-10 w-64" />
      <Line className="mt-3 h-5 w-80" />

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <Line className="h-24" />
        <Line className="h-24" />
        <Line className="h-24" />
      </div>

      <Line className="mt-10 h-6 w-40" />
      <div className="mt-4 space-y-3">
        <Line className="h-20" />
        <Line className="h-20" />
        <Line className="h-20" />
      </div>
    </main>
  );
}
