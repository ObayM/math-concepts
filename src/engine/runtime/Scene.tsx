'use client';
import { SceneProvider } from './SceneProvider';
import Timeline from './Timeline';
import SvgRenderer from '@/engine/renderers/svg/SvgRenderer';
import { controlRegistry } from '@/engine/controls/registry';
import type { SceneIR } from '@/engine/ir/types';

// pick the backend from the scene (svg by default). canvas/webgl slot in here later
const renderers = { svg: SvgRenderer };

export function Scene({ ir }: { ir: SceneIR }) {
  const Renderer = renderers[ir.space.render ?? 'svg'];
  return (
    <SceneProvider ir={ir}>
      <div className="flex flex-col gap-4">
        <Renderer ir={ir} />
        {ir.timeline && ir.timeline.length > 0 && <Timeline ir={ir} />}
        {ir.controls && ir.controls.length > 0 && (
          <div className="flex flex-col gap-3">
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
