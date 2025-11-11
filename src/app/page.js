import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-65px)] bg-linear-to-b from-cyan-50 to-amber-50 text-neutral-800">
      <main className="container mx-auto px-6">
        <section className="flex flex-col items-center justify-center text-center py-32 md:py-40">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900 mb-6 leading-tight">
                Learn Math <span className="bg-linear-to-r from-blue-700 via-blue-400 to-blue-800 bg-clip-text text-transparent">Visually</span>
              </h1>
              <p className="text-lg text-gray-600 mb-10 max-w-2xl">
                Explore interactive lessons that make math cool and fun and see the concepts come to life!
              </p>
              <Link
                href="/lessons"
                className="bg-blue-700 text-white px-8 py-3 rounded-sm text-lg hover:scale-105 transition-all duration-300 ease-in-out"
              >
                Start Learning
              </Link>
            </section>
      </main>
    </div>
);
}