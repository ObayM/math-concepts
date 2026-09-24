'use client';
import { useEffect, useRef } from 'react';
import { SceneProvider, useScene } from './SceneProvider';
import Timeline from './Timeline';
import SvgRenderer from '@/engine/renderers/svg/SvgRenderer';
import NumberlineRenderer from '@/engine/renderers/svg/NumberlineRenderer';
import Space3Renderer from '@/engine/renderers/svg/Space3Renderer';
import { controlRegistry } from '@/engine/controls/registry';
import type { InputLayerConfig } from '@/engine/renderers/svg/InputLayer';
import type { SceneIR, Scope } from '@/engine/ir/types';

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

export function Scene({
  ir,
  onScopeChange,
  onTap,
  marker,
  revealed,
  inputLayer,
  tapLabel,
  command,
}: {
  ir: SceneIR;
  onScopeChange?: (scope: Scope) => void;
  onTap?: (x: number, y: number) => void;
  marker?: { x: number; y: number; correct?: boolean };
  revealed?: boolean;
  inputLayer?: InputLayerConfig;
  tapLabel?: string;
  command?: SceneCommand;
}) {
  const Renderer =
    ir.space.type === 'numberline'
      ? NumberlineRenderer
      : ir.space.type === 'space3'
        ? Space3Renderer
        : SvgRenderer;
  return (
    <SceneProvider ir={ir} onScopeChange={onScopeChange}>
      <RunCommand command={command} />
      <div className="flex flex-col gap-4">
        <Renderer
          ir={ir}
          onTap={onTap}
          marker={marker}
          revealed={revealed}
          inputLayer={inputLayer}
          tapLabel={tapLabel}
        />
        {ir.timeline && ir.timeline.length > 0 && <Timeline ir={ir} />}
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
