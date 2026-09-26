'use client';
import { useEffect, useMemo, useRef } from 'react';
import { SceneProvider, useScene } from './SceneProvider';
import Timeline from './Timeline';
import SvgRenderer from '@/engine/renderers/svg/SvgRenderer';
import NumberlineRenderer from '@/engine/renderers/svg/NumberlineRenderer';
import Space3Renderer from '@/engine/renderers/svg/Space3Renderer';
import { controlRegistry } from '@/engine/controls/registry';
import type { InputLayerConfig } from '@/engine/renderers/svg/InputLayer';
import type { SceneIR, PaneIR, Scope } from '@/engine/ir/types';

export type SceneCommand = {
  id: number;
  set: Record<string, number | boolean>;
  duration?: number;
};

function RunCommand({ command }: { command?: SceneCommand }) {
  const { animate, setMany } = useScene();
  const ran = useRef<number | null>(null);
  useEffect(() => {
    if (!command || ran.current === command.id) return;
    ran.current = command.id;
    const tween: Record<string, number> = {};
    const flip: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(command.set)) {
      if (typeof v === 'number') tween[k] = v;
      else flip[k] = v;
    }
    if (Object.keys(flip).length) setMany(flip);
    if (Object.keys(tween).length) animate(tween, command.duration ?? 2000, 'easeInOut');
  }, [command, animate, setMany]);
  return null;
}

function Diagram(props: React.ComponentProps<typeof SvgRenderer>) {
  if (props.ir.space.type === 'numberline') return <NumberlineRenderer {...props} />;
  if (props.ir.space.type === 'space3') return <Space3Renderer {...props} />;
  return <SvgRenderer {...props} />;
}

export function Scene({
  ir,
  pane,
  onScopeChange,
  onTap,
  marker,
  revealed,
  inputLayer,
  tapLabel,
  command,
  onStepChange,
  initial,
}: {
  ir: SceneIR;
  pane?: PaneIR;
  onScopeChange?: (scope: Scope) => void;
  onTap?: (x: number, y: number) => void;
  marker?: { x: number; y: number; correct?: boolean };
  revealed?: boolean;
  inputLayer?: InputLayerConfig;
  tapLabel?: string;
  command?: SceneCommand;
  onStepChange?: (idx: number) => void;
  initial?: Record<string, number>;
}) {
  const second = useMemo(() => (pane ? { ...pane, state: ir.state } : null), [pane, ir.state]);
  const whole = useMemo(
    () => (pane ? { ...ir, objects: [...ir.objects, ...pane.objects] } : ir),
    [ir, pane]
  );
  const main = (
    <Diagram
      ir={ir}
      onTap={onTap}
      marker={marker}
      revealed={revealed}
      inputLayer={inputLayer}
      tapLabel={tapLabel}
    />
  );
  return (
    <SceneProvider ir={whole} onScopeChange={onScopeChange} initial={initial}>
      <RunCommand command={command} />
      <div className="flex flex-col gap-4">
        {second ? (
          <div className="@container">
            <div className="grid grid-cols-1 items-start gap-4 @xl:grid-cols-2">
              <div className="min-w-0">{main}</div>
              <div className="min-w-0">
                <Diagram ir={second} revealed={revealed} />
              </div>
            </div>
          </div>
        ) : (
          main
        )}
        {ir.timeline && ir.timeline.length > 0 && <Timeline ir={ir} onStepChange={onStepChange} />}
        {ir.controls && ir.controls.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            {ir.controls.map((control, i) => {
              const Control = controlRegistry[control.as];
              return Control ? <Control key={i} control={control} /> : null;
            })}
          </div>
        )}
      </div>
    </SceneProvider>
  );
}
