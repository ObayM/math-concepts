'use client';
import { useScene } from '@/engine/runtime/SceneProvider';

type StepperControl = { as: 'stepper'; bind: string; label?: string; step?: number };

export default function Stepper({ control }: { control: StepperControl }) {
  const { scope, set, ir } = useScene();
  const def = ir.state[control.bind];
  const dnum = def?.type === 'number' ? def : undefined;
  const step = control.step ?? dnum?.step ?? 1;
  const val = Number(scope[control.bind] ?? 0);

  const btn =
    'w-9 h-9 rounded-xl bg-white border border-neutral-200 font-bold text-lg text-neutral-600 hover:border-primary-400 active:scale-90 transition flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300';

  return (
    <div className="w-full flex items-center justify-between bg-neutral-100 rounded-2xl p-4">
      <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
        {control.label || control.bind}
      </span>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => set(control.bind, val - step)} className={btn}>
          −
        </button>
        <span className="font-mono font-bold text-neutral-700 w-12 text-center">
          {Math.round(val * 100) / 100}
        </span>
        <button type="button" onClick={() => set(control.bind, val + step)} className={btn}>
          +
        </button>
      </div>
    </div>
  );
}
