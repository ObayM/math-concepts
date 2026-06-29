'use client';
import RichText from '../RichText';

export default function TextBlock({ slide }) {
  return (
    <div className="h-full flex flex-col justify-center">
      <RichText className="text-xl text-neutral-600 leading-relaxed font-medium">
        {slide.content}
      </RichText>
    </div>
  );
}
