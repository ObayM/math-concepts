'use client';
import { useScene } from '../runtime/SceneProvider';

type ToggleControl = { as: 'toggle'; bind: string; label?: string };

export default function Toggle({ control }: { control: ToggleControl }) {
  const { scope, set } = useScene();
  const on = !!scope[control.bind];

  return (
    <button
      type="button"
      onClick={() => set(control.bind, !on)}
      className="flex items-center justify-between bg-neutral-100 rounded-2xl p-4 text-left"
    >
      <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
        {control.label || control.bind}
      </span>
      <span
        className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-success-500' : 'bg-neutral-300'}`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${on ? 'left-[22px]' : 'left-0.5'}`}
        />
      </span>
    </button>
  );
}
