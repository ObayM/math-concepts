import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { accuracyPct, paceMs, formatPace, formatDuration } from '@/lib/warmup/stats';

function Figure({ label, value }) {
  return (
    <div>
      <p className="text-2xl font-extrabold tabular-nums text-neutral-900">{value}</p>
      <p className="mt-0.5 text-xs font-bold uppercase tracking-[0.1em] text-neutral-400">
        {label}
      </p>
    </div>
  );
}

function verdict(answered, accuracy) {
  if (!answered) return 'Nothing logged this time. The keypad is right there when you want it.';
  if (accuracy >= 95) return 'Almost nothing got past you. That is what reflex looks like.';
  if (accuracy >= 80) return 'Sharp. Nudge the level up when this starts feeling slow.';
  if (accuracy >= 55) return 'Solid middle ground. Speed comes after the misses stop.';
  return 'Rough round. Drop a level and build the reflex from underneath.';
}

export default function StopScreen({ stats, xpEarned, capped, levelName, onAgain }) {
  const accuracy = accuracyPct(stats.correct, stats.answered);
  const pace = paceMs(stats.totalMs, stats.answered);

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 pb-4 pt-[var(--nav-h)] md:px-6">
      <Card className="card-hero animate-fade-in-up w-full max-w-lg rounded-3xl p-10 text-center max-md:p-6">
        <p className="mb-3 text-sm font-bold uppercase tracking-wider text-primary-500">
          {levelName}
        </p>
        <h1 className="font-display mb-2 text-4xl font-bold tracking-tight text-neutral-900">
          {stats.correct} out of {stats.answered}
        </h1>
        <p className="mb-8 text-neutral-500">{verdict(stats.answered, accuracy)}</p>

        <div className="mb-8 grid grid-cols-2 gap-6 border-y border-neutral-100 py-6 sm:grid-cols-4">
          <Figure label="Accuracy" value={`${accuracy}%`} />
          <Figure label="Best run" value={stats.bestStreak} />
          <Figure label="Per question" value={formatPace(pace)} />
          <Figure label="Time" value={formatDuration(stats.sittingMs)} />
        </div>

        {xpEarned > 0 && (
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-warning-100 px-4 py-1.5 text-sm font-bold text-warning-600">
            +{xpEarned} XP
          </p>
        )}
        {capped && (
          <p className="mb-2 text-sm text-neutral-400">
            That is all the XP a warm up pays today. Keep drilling, it still counts.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <Button onClick={onAgain} variant="primary">
            Go again
          </Button>
          <Button as={Link} href="/warmup/history" variant="outline">
            See your history
          </Button>
          <Button as={Link} href="/warmup" variant="ghost">
            Pick another level
          </Button>
        </div>
      </Card>
    </div>
  );
}
