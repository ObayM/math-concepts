import Link from 'next/link';
import { ArrowRight, History, Zap } from 'lucide-react';
import Card from '@/components/ui/Card';
import { formatPace } from '@/lib/warmup/stats';

const eyebrow = 'text-xs font-bold uppercase tracking-[0.12em] text-neutral-400';

function LevelRow({ level }) {
  const played = level.answered > 0;
  return (
    <Card
      as={Link}
      href={`/warmup/${level.id}`}
      pressable
      className="tap-target-h group flex items-center gap-4 p-4 sm:p-5"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-extrabold text-neutral-500">
        {level.id}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-neutral-900">{level.name}</span>
        <span className="mt-0.5 block truncate text-sm text-neutral-500">
          <span className="font-bold tabular-nums text-neutral-400">{level.example}</span>
          <span className="mx-1.5 text-neutral-300">·</span>
          {level.blurb}
        </span>
      </span>
      <span className="hidden shrink-0 text-end sm:block">
        {played ? (
          <>
            <span className="block text-sm font-extrabold tabular-nums text-neutral-800">
              {level.accuracy}%
            </span>
            <span className="mt-0.5 block text-xs text-neutral-400">
              {level.bestPace ? `best ${formatPace(level.bestPace)}` : `${level.answered} answered`}
            </span>
          </>
        ) : (
          <span className="text-xs text-neutral-300">not tried</span>
        )}
      </span>
      <ArrowRight
        className="h-5 w-5 shrink-0 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-500"
        aria-hidden
      />
    </Card>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-2xl font-extrabold tabular-nums text-neutral-900">{value}</p>
      <p className={`${eyebrow} mt-0.5`}>{label}</p>
    </div>
  );
}

export default function LevelPicker({ overview, totals }) {
  const resume = overview.lastLevel
    ? overview.levels.find((l) => l.id === overview.lastLevel)
    : null;

  return (
    <div className="bg-app -mt-[var(--nav-h)] min-h-dvh pt-[var(--nav-h)]">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="animate-fade-in-up">
          <p className={eyebrow}>Warm up</p>
          <h1 className="font-display mt-2 text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            Get fast at the easy stuff.
          </h1>
          <p className="mt-3 text-lg text-neutral-500">
            Short questions, no clock, stop whenever. Pick any level, any time.
          </p>
        </div>

        {totals.answered > 0 && (
          <Card className="card-soft animate-fade-in-up mt-8 grid grid-cols-2 gap-6 p-6 opacity-0 [animation-delay:80ms] sm:grid-cols-4">
            <Stat label="Answered" value={totals.answered.toLocaleString('en-US')} />
            <Stat label="Accuracy" value={`${totals.accuracy}%`} />
            <Stat label="Per question" value={formatPace(totals.pace)} />
            <Stat label="Sessions" value={totals.sessions} />
          </Card>
        )}

        {resume && (
          <Link
            href={`/warmup/${resume.id}`}
            className="animate-fade-in-up mt-8 flex items-center gap-2 text-sm font-bold text-primary-600 opacity-0 [animation-delay:120ms] hover:text-primary-700"
          >
            <Zap className="h-4 w-4" aria-hidden />
            Pick up where you left off, level {resume.id}
          </Link>
        )}

        <div className="animate-fade-in-up mt-8 space-y-2.5 opacity-0 [animation-delay:160ms]">
          {overview.levels.map((level) => (
            <LevelRow key={level.id} level={level} />
          ))}
        </div>

        <Link
          href="/warmup/history"
          className="animate-fade-in-up mt-8 inline-flex items-center gap-2 text-sm font-bold text-neutral-500 opacity-0 [animation-delay:220ms] hover:text-neutral-800"
        >
          <History className="h-4 w-4" aria-hidden />
          Your history and weak spots
        </Link>
      </div>
    </div>
  );
}
