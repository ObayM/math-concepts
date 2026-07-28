'use client';
import { useScene } from '@/engine/runtime/SceneProvider';

type PickerControl = { as: 'picker'; bind: string; label?: string };

export default function Picker({ control }: { control: PickerControl }) {
  const { scope, set, ir } = useScene();
  const def = ir.state[control.bind];
  const options = def?.type === 'enum' ? def.options : [];
  const current = scope[control.bind];
  const name = control.label || control.bind;

  return (
    <div className="w-full rounded-2xl bg-neutral-100 p-4">
      <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">{name}</span>
      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={name}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={opt === current}
            onClick={() => set(control.bind, opt)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 ${
              opt === current
                ? 'bg-primary-500 text-white'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:border-primary-400'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
