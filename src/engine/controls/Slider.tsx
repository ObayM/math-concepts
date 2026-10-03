'use client';
import { useScene } from '@/engine/runtime/SceneProvider';
import { shortNum } from '@/engine/format';
import { useSceneText } from '@/engine/artex/context';
import { useT } from '@/components/i18n/LocaleProvider';

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
  const t = useT();
  const def = ir.state[control.bind];
  const dnum = def?.type === 'number' ? def : undefined;

  const min = control.min ?? dnum?.min ?? 0;
  const max = control.max ?? dnum?.max ?? 100;
  const step = control.step ?? dnum?.step ?? ((max - min) / 100 || 1);
  const val = Number(scope[control.bind] ?? min);
  const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;

  const name = control.label || control.bind;
  const sceneText = useSceneText();
  const shown = shortNum(val);

  return (
    <div className="w-full bg-neutral-100 rounded-2xl px-4 py-3">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
          {sceneText(name)}
        </span>
        <span className="font-mono text-lg font-bold tabular-nums leading-none text-primary-600">
          {sceneText(shown)}
        </span>
      </div>
      <div className="group relative h-6">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={val}
          aria-label={name}
          aria-valuetext={t('scene.valueIs', { name, value: shown })}
          onChange={(e) => set(control.bind, Number(e.target.value))}
          className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
        <div className="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-neutral-200 rounded-full" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-2 bg-primary-500 rounded-full"
          style={{ width: `${pct}%` }}
        />
        <div
          className="pointer-events-none absolute top-1/2 -ml-3 h-6 w-6 -translate-y-1/2 rounded-full border-[3px] border-primary-500 bg-white transition-transform group-hover:scale-110 peer-active:scale-125 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-300"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[11px] tabular-nums text-neutral-400">
        <span>{sceneText(shortNum(min))}</span>
        <span>{sceneText(shortNum(max))}</span>
      </div>
    </div>
  );
}
