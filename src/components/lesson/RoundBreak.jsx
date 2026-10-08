'use client';
import { useEffect, useRef } from 'react';
import { Flag } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useT } from '@/components/i18n/LocaleProvider';
import QuestionGrid, { resultOf } from './QuestionGrid';

export default function RoundBreak({
  rounds,
  finished,
  path,
  results,
  current,
  onJump,
  onResume,
  onStop,
}) {
  const t = useT();
  const headingRef = useRef(null);
  useEffect(() => headingRef.current?.focus({ preventScroll: true }), []);

  const done = finished === null ? null : rounds[finished];
  const right = done
    ? path
        .slice(done.start, done.start + done.size)
        .filter((s) => resultOf(results, s.id) === 'right').length
    : 0;
  const more = finished !== null && finished < rounds.length - 1;
  const roundName = (r, i) =>
    `${t('bank.roundOf', { n: i + 1, total: rounds.length })}${r.label ? ` · ${r.label}` : ''}`;

  return (
    <div className="flex h-full flex-col items-center p-6 text-center">
      {done && (
        <div className="animate-pop-in mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success-100">
          <Flag className="h-10 w-10 text-success-500" />
        </div>
      )}
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-3xl font-bold text-neutral-900 outline-none"
      >
        {done ? t('bank.roundDone', { n: finished + 1 }) : t('bank.overview')}
      </h2>
      {done && (
        <p className="mt-2 text-lg text-neutral-500">
          {t('bank.roundScore', { right, total: done.size })}
        </p>
      )}

      <div className="mt-8 w-full max-w-lg space-y-3 text-start">
        {done && (
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-400">
            {t('bank.overview')}
          </p>
        )}
        {rounds.map((r, i) => (
          <div key={r.start}>
            <p className="text-sm font-semibold text-neutral-600">{roundName(r, i)}</p>
            <QuestionGrid
              path={path}
              round={r}
              current={current}
              results={results}
              onJump={onJump}
              label={roundName(r, i)}
            />
          </div>
        ))}
      </div>

      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        {(more || !done) && (
          <Button variant="primary" size="lg" fullWidth onClick={onResume}>
            {done ? t('bank.nextRound') : t('bank.backToQuestion')}
          </Button>
        )}
        <Button variant={more || !done ? 'ghost' : 'primary'} size="lg" fullWidth onClick={onStop}>
          {t('bank.doneForNow')}
        </Button>
      </div>
    </div>
  );
}
