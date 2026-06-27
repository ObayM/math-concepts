'use client';
import { FunctionVisualizer } from '@/components/visualizations';

export default function GraphBlock({ slide, interactiveValue, onInteractiveChange }) {
  return (
    <div className="flex flex-col space-y-6 h-full">
      <p className="text-xl text-neutral-600 leading-relaxed font-medium">{slide.content}</p>

      {slide.visualization && (
        <div className="flex flex-col space-y-4">
          <FunctionVisualizer config={slide.visualization} interactiveValue={interactiveValue} />

          <div className="bg-neutral-100 rounded-3xl p-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Interact
              </span>
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                {slide.visualization.paramLabel || 'Value'}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={interactiveValue}
              onChange={(e) => onInteractiveChange(Number(e.target.value))}
              className="w-full h-12 opacity-0 absolute z-20 cursor-pointer"
            />
            <div className="relative w-full h-4 bg-neutral-200 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-primary-500 rounded-full transition-all duration-75 ease-out"
                style={{ width: `${interactiveValue}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-1 h-3 bg-neutral-300 rounded-full" />
              ))}
            </div>
            <p className="text-center text-neutral-500 text-sm font-medium mt-3">Drag to explore</p>
          </div>
        </div>
      )}
    </div>
  );
}
