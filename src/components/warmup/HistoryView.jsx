import Link from 'next/link';
import { Download, TrendingDown, Target } from 'lucide-react';
import Card from '@/components/ui/Card';
import SpeedChart from '@/components/warmup/SpeedChart';
import { formatPace, formatDuration, factLabel } from '@/lib/warmup/stats';
import { getT } from '@/lib/i18n/server';

const eyebrow = 'text-xs font-bold uppercase tracking-[0.12em] text-neutral-400';

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-2xl font-extrabold text-neutral-900">{value}</p>
      <p className={`${eyebrow} mt-0.5`}>{label}</p>
    </div>
  );
}

function Section({ title, hint, icon: Icon, children }) {
  return (
    <Card className="card-soft p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-2 font-bold text-neutral-900">
          {Icon && <Icon className="h-4 w-4 text-neutral-400" aria-hidden />}
          {title}
        </h2>
        {hint && <p className="text-xs text-neutral-400">{hint}</p>}
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function FilterChips({ levels, active, t }) {
  const chip = (isActive) =>
    `tap-target-h inline-flex items-center rounded-full px-3 py-1.5 text-sm font-bold transition-colors ${
      isActive
        ? 'bg-neutral-900 text-white'
        : 'bg-white text-neutral-500 border border-neutral-200 hover:text-neutral-800'
    }`;

  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/warmup/history" className={chip(!active)}>
        {t('warmup.allLevels')}
      </Link>
      {levels.map((level) => (
        <Link
          key={level.id}
          href={`/warmup/history?level=${level.id}`}
          className={chip(active === level.id)}
        >
          {level.id}
        </Link>
      ))}
    </div>
  );
}

export default async function HistoryView({ level, levels, totals, trend, weakSpots, sessions }) {
  const t = await getT();
  return (
    <div className="bg-app -mt-[var(--nav-h)] min-h-dvh pt-[var(--nav-h)]">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="animate-fade-in-up">
          <p className={eyebrow}>{t('warmup.title')}</p>
          <h1 className="font-display mt-2 text-4xl font-bold tracking-tight text-neutral-900">
            {t('warmup.historyTitle')}
          </h1>
          <p className="mt-3 text-neutral-500">{t('warmup.historyBlurb')}</p>
        </div>

        <div className="animate-fade-in-up mt-8 opacity-0 [animation-delay:80ms]">
          <FilterChips levels={levels} active={level} t={t} />
        </div>

        {totals.answered === 0 ? (
          <Card className="card-soft mt-6 p-8 text-center">
            <p className="font-bold text-neutral-900">{t('warmup.nothingYet')}</p>
            <p className="mt-2 text-neutral-500">{t('warmup.historyEmpty')}</p>
            <Link
              href="/warmup"
              className="mt-6 inline-block font-bold text-primary-600 hover:text-primary-700"
            >
              {t('warmup.pickALevel')}
            </Link>
          </Card>
        ) : (
          <div className="animate-fade-in-up mt-6 space-y-6 opacity-0 [animation-delay:140ms]">
            <Card className="card-soft grid grid-cols-2 gap-6 p-6 sm:grid-cols-4">
              <Stat label={t('warmup.answered')} value={totals.answered.toLocaleString('en-US')} />
              <Stat label={t('warmup.accuracy')} value={`${totals.accuracy}%`} />
              <Stat label={t('warmup.perQuestion')} value={formatPace(totals.pace)} />
              <Stat label={t('warmup.sessions')} value={totals.sessions} />
            </Card>

            <Section
              title={t('warmup.gettingFaster')}
              hint="seconds per question, lower is better"
              icon={TrendingDown}
            >
              <SpeedChart trend={trend} />
            </Section>

            <Section title={t('warmup.slowestFacts')} hint="last 30 days" icon={Target}>
              {weakSpots.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  Nothing stands out yet. A fact needs a few attempts before it counts as a weak
                  spot.
                </p>
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {weakSpots.map((fact) => (
                    <li key={fact.factKey} className="flex items-center gap-4 py-2.5">
                      <span className="font-display flex-1 truncate text-lg font-bold text-neutral-900">
                        {factLabel(fact.factKey, fact.prompt)}
                      </span>
                      <span className="text-sm font-bold tabular-nums text-neutral-700">
                        {formatPace(fact.avgMs)}
                      </span>
                      <span className="w-24 text-end text-xs tabular-nums text-neutral-400">
                        {fact.misses > 0
                          ? `${fact.misses} of ${fact.attempts} missed`
                          : `${fact.attempts} seen`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title={t('warmup.everySession')} hint={`${sessions.length} shown`}>
              <div className="-mx-2 overflow-x-auto px-2">
                <table className="w-full min-w-[38rem] text-start text-sm">
                  <thead>
                    <tr className={eyebrow}>
                      <th className="py-2 pe-4 font-bold">{t('warmup.when')}</th>
                      <th className="py-2 pe-4 font-bold">Lvl</th>
                      <th className="py-2 pe-4 font-bold">{t('warmup.answered')}</th>
                      <th className="py-2 pe-4 font-bold">{t('warmup.right')}</th>
                      <th className="py-2 pe-4 font-bold">{t('warmup.streak')}</th>
                      <th className="py-2 pe-4 font-bold">{t('warmup.satFor')}</th>
                      <th className="py-2 pe-4 font-bold">{t('warmup.answering')}</th>
                      <th className="py-2 font-bold">{t('warmup.each')}</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums text-neutral-600">
                    {sessions.map((session) => (
                      <tr key={session.id} className="border-t border-neutral-100">
                        <td className="whitespace-nowrap py-2.5 pe-4 font-bold text-neutral-800">
                          {session.label}
                        </td>
                        <td className="py-2.5 pe-4">{session.level}</td>
                        <td className="py-2.5 pe-4">{session.answered}</td>
                        <td className="py-2.5 pe-4">{session.accuracy}%</td>
                        <td className="py-2.5 pe-4">{session.bestStreak}</td>
                        <td className="py-2.5 pe-4">{formatDuration(session.durationMs)}</td>
                        <td className="py-2.5 pe-4">{formatDuration(session.totalMs)}</td>
                        <td className="py-2.5">{formatPace(session.pace)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="/api/warmup/export?scope=sessions"
                download
                className="tap-target-h inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-bold text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
              >
                <Download className="h-4 w-4" aria-hidden />
                Sessions CSV
              </a>
              <a
                href="/api/warmup/export?scope=answers"
                download
                className="tap-target-h inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-bold text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
              >
                <Download className="h-4 w-4" aria-hidden />
                Every answer CSV
              </a>
              <Link
                href="/warmup"
                className="text-sm font-bold text-neutral-500 hover:text-neutral-800"
              >
                Back to levels
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
