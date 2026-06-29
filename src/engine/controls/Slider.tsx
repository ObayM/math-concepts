'use client';
import { useScene } from '@/engine/runtime/SceneProvider';

type SliderControl = {
  as: 'slider';
  bind: string;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
};

export default function Slider({ control }: { control: SliderControl }) {
  const { scope, set, ir } = useScene();
  const def = ir.state[control.bind];
  const dnum = def?.type === 'number' ? def : undefined;

  const min = control.min ?? dnum?.min ?? 0;
  const max = control.max ?? dnum?.max ?? 100;
  const step = control.step ?? dnum?.step ?? ((max - min) / 100 || 1);
  const val = Number(scope[control.bind] ?? min);
  const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;

  return (
    <div className="w-full bg-neutral-100 rounded-2xl p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
          {control.label || control.bind}
        </span>
        <span className="text-xs font-mono font-bold text-neutral-700">
          {Math.round(val * 100) / 100}
        </span>
      </div>
      <div className="relative h-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={val}
          onChange={(e) => set(control.bind, Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-neutral-200 rounded-full" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-2 bg-primary-500 rounded-full"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 -ml-2 bg-white border-2 border-primary-500 rounded-full"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}
