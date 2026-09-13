import Link from 'next/link';
import { ArrowRight, History, Zap } from 'lucide-react';
import Card from '@/components/ui/Card';
import { formatPace } from '@/lib/warmup/stats';
import { getT } from '@/lib/i18n/server';
import { levelName, levelBlurb } from '@/lib/warmup/level-copy';

const eyebrow = 'text-xs font-bold uppercase tracking-[0.12em] text-neutral-400';

function LevelRow({ level, t }) {
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
        <span className="block font-bold text-neutral-900">
          {levelName(t, level.id, level.name)}
        </span>
        <span className="mt-0.5 block truncate text-sm text-neutral-500">
          <span className="font-bold tabular-nums text-neutral-400">{level.example}</span>
          <span className="mx-1.5 text-neutral-300">·</span>
          {levelBlurb(t, level.id, level.blurb)}
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
          <span className="text-xs text-neutral-300">{t('warmup.notTried')}</span>
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

export default async function LevelPicker({ overview, totals }) {
  const t = await getT();
  const resume = overview.lastLevel
    ? overview.levels.find((l) => l.id === overview.lastLevel)
    : null;

  return (
    <div className="-mt-[var(--nav-h)] min-h-dvh pt-[var(--nav-h)]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="animate-fade-in-up">
          <p className={eyebrow}>{t('warmup.title')}</p>
          <h1 className="font-display mt-2 text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            {t('warmup.heroTitle')}
          </h1>
          <p className="mt-3 text-lg text-neutral-500">{t('warmup.heroBlurb')}</p>
        </div>

        {totals.answered > 0 && (
          <Card className="card-soft animate-fade-in-up mt-8 grid grid-cols-2 gap-6 p-6 opacity-0 [animation-delay:80ms] sm:grid-cols-4">
            <Stat label={t('warmup.answered')} value={totals.answered.toLocaleString('en-US')} />
            <Stat label={t('warmup.accuracy')} value={`${totals.accuracy}%`} />
            <Stat label={t('warmup.perQuestion')} value={formatPace(totals.pace)} />
            <Stat label={t('warmup.sessions')} value={totals.sessions} />
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
            <LevelRow key={level.id} level={level} t={t} />
          ))}
        </div>

        <Link
          href="/warmup/history"
          className="tap-target-h animate-fade-in-up mt-8 inline-flex items-center gap-2 text-sm font-bold text-neutral-500 opacity-0 [animation-delay:220ms] hover:text-neutral-800"
        >
          <History className="h-4 w-4" aria-hidden />
          {t('warmup.historyLink')}
        </Link>
      </div>
    </div>
  );
}
