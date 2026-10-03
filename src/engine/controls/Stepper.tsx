'use client';
import { useScene } from '@/engine/runtime/SceneProvider';
import { shortNum } from '@/engine/format';
import { useSceneText } from '@/engine/artex/context';
import { useT } from '@/components/i18n/LocaleProvider';

type StepperControl = { as: 'stepper'; bind: string; label?: string; step?: number };

export default function Stepper({ control }: { control: StepperControl }) {
  const { scope, set, ir } = useScene();
  const t = useT();
  const def = ir.state[control.bind];
  const dnum = def?.type === 'number' ? def : undefined;
  const step = control.step ?? dnum?.step ?? 1;
  const val = Number(scope[control.bind] ?? 0);

  const btn =
    'tap-target w-9 h-9 rounded-xl bg-card border border-neutral-200 font-bold text-lg text-neutral-600 hover:border-primary-400 active:scale-90 transition flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300';

  const name = control.label || control.bind;
  const sceneText = useSceneText();
  const shown = shortNum(val);

  return (
    <div className="flex w-full items-center justify-between rounded-2xl bg-neutral-100 p-4">
      <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
        {sceneText(name)}
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={t('scene.decrease', { name })}
          onClick={() => set(control.bind, val - step)}
          className={btn}
        >
          −
        </button>
        <span
          role="status"
          aria-label={t('scene.valueIs', { name, value: shown })}
          className="w-12 text-center font-mono text-lg font-bold tabular-nums text-primary-600"
        >
          {sceneText(shown)}
        </span>
        <button
          type="button"
          aria-label={t('scene.increase', { name })}
          onClick={() => set(control.bind, val + step)}
          className={btn}
        >
          +
        </button>
      </div>
    </div>
  );
}
