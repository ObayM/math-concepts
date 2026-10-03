'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Play, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useT } from '@/components/i18n/LocaleProvider';

const MiniPlayer = dynamic(() => import('@/components/prism/MiniPlayer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[26rem] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
    </div>
  ),
});

function Poster({ onPlay, label }) {
  return (
    <div className="relative flex h-[26rem] items-center justify-center overflow-hidden">
      <svg
        viewBox="0 0 400 260"
        className="absolute inset-0 h-full w-full text-neutral-200"
        aria-hidden
      >
        <defs>
          <pattern id="demo-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0v20" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="400" height="260" fill="url(#demo-grid)" />
        <path d="M40 240 L360 240" stroke="currentColor" strokeWidth="1.5" />
        <path d="M200 20 L200 240" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M60 40 Q200 320 340 40"
          fill="none"
          className="text-primary-500"
          stroke="currentColor"
          strokeWidth="3"
        />
        <circle cx="270" cy="150" r="7" className="text-accent-500" fill="currentColor" />
        <path
          d="M200 210 L340 90"
          className="text-accent-500"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="6 5"
        />
      </svg>

      <Button onClick={onPlay} size="lg" className="relative">
        <Play className="h-5 w-5 fill-current" />
        {label}
      </Button>
    </div>
  );
}

export default function LiveDemo({ lesson }) {
  const t = useT();
  const [playing, setPlaying] = useState(false);

  return (
    <div dir="ltr" className="overflow-hidden rounded-3xl border border-neutral-200/80 bg-card">
      {playing ? (
        <div className="p-4 sm:p-6">
          <MiniPlayer lesson={lesson} />
        </div>
      ) : (
        <Poster onPlay={() => setPlaying(true)} label={t('home.demoLoad')} />
      )}
    </div>
  );
}
