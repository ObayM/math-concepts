'use client';
import { Delete, CornerDownLeft } from 'lucide-react';
import clsx from 'clsx';

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '-', '0'];

const keyClass =
  'tap-target flex h-14 items-center justify-center rounded-xl border-b-[3px] bg-white text-2xl font-extrabold text-neutral-800 border-neutral-300 active:border-b-0 active:translate-y-[3px] transition-all duration-100';

export default function Keypad({ onPress, submitLabel = 'Check', className = '' }) {
  return (
    <div className={clsx('select-none', className)}>
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            aria-label={key === '-' ? 'minus' : key}
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
          aria-label="backspace"
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
        className="tap-target mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-xl border-b-[3px] border-primary-800 bg-primary-600 text-lg font-bold text-white transition-all duration-100 active:translate-y-[3px] active:border-b-0"
      >
        <CornerDownLeft className="h-5 w-5" aria-hidden />
        {submitLabel}
      </button>
    </div>
  );
}
