'use client';
import { useScene } from '@/engine/runtime/SceneProvider';

type PickerControl = { as: 'picker'; bind: string; label?: string };

export default function Picker({ control }: { control: PickerControl }) {
  const { scope, set, ir } = useScene();
  const def = ir.state[control.bind];
  const options = def?.type === 'enum' ? def.options : [];
  const current = scope[control.bind];

  return (
    <div className="w-full bg-neutral-100 rounded-2xl p-4">
      <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
        {control.label || control.bind}
      </span>
      <div className="flex flex-wrap gap-2 mt-3">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
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
