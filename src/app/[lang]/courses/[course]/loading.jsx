function Line({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-200/70 ${className}`} />;
}

export default function CourseLoading() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <Line className="h-4 w-28" />
      <Line className="mt-4 h-10 w-72" />
      <Line className="mt-3 h-5 w-full max-w-xl" />

      <div className="mt-10 space-y-6">
        {[0, 1].map((unit) => (
          <div key={unit} className="space-y-3">
            <Line className="h-5 w-32" />
            <Line className="h-16" />
            <Line className="h-16" />
            <Line className="h-16" />
          </div>
        ))}
      </div>
    </main>
  );
}
