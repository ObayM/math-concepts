'use client';
import { useScene } from '@/engine/runtime/SceneProvider';

type ButtonControl = {
  as: 'button';
  label: string;
  set?: Record<string, number | boolean>;
  step?: Record<string, number>;
  toggle?: string;
  animate?: Record<string, number>;
  duration?: number;
  ease?: string;
};

export default function Button({ control }: { control: ButtonControl }) {
  const { scope, set, setMany, animate } = useScene();

  const onClick = () => {
    if (control.set) setMany(control.set);
    if (control.toggle) set(control.toggle, !scope[control.toggle]);
    if (control.step) {
      setMany(
        Object.fromEntries(
          Object.entries(control.step).map(([k, d]) => [k, Number(scope[k] ?? 0) + Number(d)])
        )
      );
    }
    if (control.animate) animate(control.animate, control.duration, control.ease);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm px-5 py-3 rounded-2xl border-b-4 border-primary-700 active:border-b-0 active:translate-y-1 transition-all"
    >
      {control.label}
    </button>
  );
}
