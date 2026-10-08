'use client';
import { useT } from '@/components/i18n/LocaleProvider';

const COLOR = {
  right: 'bg-success-500',
  wrong: 'border-2 border-danger-500',
  open: 'bg-neutral-200',
};

export const resultOf = (results, slideId) => {
  const r = results.get(slideId);
  return r === undefined ? 'open' : r ? 'right' : 'wrong';
};

export default function QuestionGrid({ path, round, current, results, onJump, label }) {
  const t = useT();
  return (
    <ol className="flex gap-1" aria-label={label ?? t('bank.gridAria')}>
      {path.slice(round.start, round.start + round.size).map((s, i) => {
        const index = round.start + i;
        const state = resultOf(results, s.id);
        const here = index === current;
        return (
          <li key={s.id} className="flex-1">
            <button
              type="button"
              onClick={() => onJump(index)}
              aria-current={here ? 'step' : undefined}
              aria-label={`${t('bank.question', { n: index + 1 })}, ${t(`bank.${state}`)}`}
              className="tap-target-h flex h-7 w-full items-center"
            >
              <span
                className={`block w-full rounded-full transition-all ${here ? 'h-3' : 'h-2'} ${here && state === 'open' ? 'bg-primary-500' : COLOR[state]}`}
              />
            </button>
          </li>
        );
      })}
    </ol>
  );
}
