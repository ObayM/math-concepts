'use client';
import { SceneProvider } from './SceneProvider';
import Timeline from './Timeline';
import SvgRenderer from '@/engine/renderers/svg/SvgRenderer';
import NumberlineRenderer from '@/engine/renderers/svg/NumberlineRenderer';
import { controlRegistry } from '@/engine/controls/registry';
import type { InputLayerConfig } from '@/engine/renderers/svg/InputLayer';
import type { SceneIR, Scope } from '@/engine/ir/types';

export function Scene({
  ir,
  onScopeChange,
  onTap,
  marker,
  revealed,
  inputLayer,
}: {
  ir: SceneIR;
  onScopeChange?: (scope: Scope) => void;
  onTap?: (x: number, y: number) => void;
  marker?: { x: number; y: number; correct?: boolean };
  revealed?: boolean;
  inputLayer?: InputLayerConfig;
}) {
  const Renderer = ir.space.type === 'numberline' ? NumberlineRenderer : SvgRenderer;
  return (
    <SceneProvider ir={ir} onScopeChange={onScopeChange}>
      <div className="flex flex-col gap-4">
        <Renderer
          ir={ir}
          onTap={onTap}
          marker={marker}
          revealed={revealed}
          inputLayer={inputLayer}
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
