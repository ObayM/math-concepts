'use client';

export default function TextBlock({ slide }) {
  return (
    <div className="h-full flex flex-col justify-center">
      <p className="text-xl text-neutral-600 leading-relaxed font-medium">{slide.content}</p>
    </div>
  );
}
