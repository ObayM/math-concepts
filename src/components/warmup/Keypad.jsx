'use client';
import { Delete, CornerDownLeft } from 'lucide-react';
import clsx from 'clsx';
import { useT } from '@/components/i18n/LocaleProvider';

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '-', '0'];

const keyClass =
  'tap-target flex h-12 items-center justify-center rounded-xl border border-neutral-200 border-b-[3px] border-b-neutral-300 bg-white text-2xl font-extrabold text-neutral-800 transition-all duration-100 active:translate-y-[2px] active:border-b active:border-b-neutral-200 sm:h-14';

export default function Keypad({ onPress, submitLabel, className = '' }) {
  const t = useT();
  return (
    <div dir="ltr" className={clsx('select-none', className)}>
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            aria-label={key === '-' ? t('warmup.minus') : key}
            onPointerDown={(e) => {
              e.preventDefault();
              onPress(key);
            }}
            className={keyClass}
          >
            {key}
          </button>
        ))}
        <button
          type="button"
          aria-label={t('warmup.backspace')}
          onPointerDown={(e) => {
            e.preventDefault();
            onPress('back');
          }}
          className={clsx(keyClass, 'text-neutral-500')}
        >
          <Delete className="h-6 w-6" aria-hidden />
        </button>
      </div>
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          onPress('enter');
        }}
        className="tap-target mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl border-b-[3px] border-primary-800 bg-primary-600 text-lg font-bold text-white transition-all duration-100 active:translate-y-[3px] active:border-b-0 sm:h-14"
      >
        <CornerDownLeft className="h-5 w-5" aria-hidden />
        {submitLabel ?? t('warmup.check')}
      </button>
    </div>
  );
}
