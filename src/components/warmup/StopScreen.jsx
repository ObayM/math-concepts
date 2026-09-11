import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { accuracyPct, paceMs, formatPace, formatDuration } from '@/lib/warmup/stats';
import { useT } from '@/components/i18n/LocaleProvider';

function Figure({ label, value }) {
  return (
    <div>
      <p className="text-2xl font-extrabold tabular-nums text-neutral-900">{value}</p>
      <p className="mt-0.5 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400">
        {label}
      </p>
    </div>
  );
}

function verdict(t, answered, accuracy) {
  if (!answered) return t('warmup.verdictNone');
  if (accuracy >= 95) return t('warmup.verdictGreat');
  if (accuracy >= 80) return t('warmup.verdictSharp');
  if (accuracy >= 55) return t('warmup.verdictMiddling');
  return t('warmup.verdictRough');
}

export default function StopScreen({ stats, xpEarned, capped, levelName, onAgain }) {
  const t = useT();
  const accuracy = accuracyPct(stats.correct, stats.answered);
  const pace = paceMs(stats.totalMs, stats.answered);

  return (
    <Card className="card-hero animate-fade-in-up w-full max-w-lg rounded-3xl p-10 text-center max-md:p-6">
      <p className="mb-3 text-sm font-bold uppercase tracking-wider text-primary-500">
        {levelName}
      </p>
      <h1 className="font-display mb-2 text-4xl font-bold tracking-tight text-neutral-900">
        {stats.correct} out of {stats.answered}
      </h1>
      <p className="mb-8 text-neutral-500">{verdict(t, stats.answered, accuracy)}</p>

      <div className="mb-8 grid grid-cols-2 gap-6 border-y border-neutral-100 py-6 sm:grid-cols-4">
        <Figure label={t('warmup.accuracy')} value={`${accuracy}%`} />
        <Figure label={t('warmup.bestRun')} value={stats.bestStreak} />
        <Figure label={t('warmup.perQuestion')} value={formatPace(pace)} />
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
  );
}
