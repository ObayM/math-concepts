'use client';
import { Scene } from '@/engine';

export default function SceneBlock({ slide }) {
  return (
    <div className="flex flex-col space-y-6 h-full">
      {slide.content && (
        <p className="text-xl text-neutral-600 leading-relaxed font-medium">{slide.content}</p>
      )}
      {slide.scene && <Scene ir={slide.scene} />}
    </div>
  );
}
