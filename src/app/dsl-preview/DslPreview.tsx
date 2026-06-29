'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Scene } from '@/engine';
import type { SceneIR } from '@/engine/ir/types';
import s from './preview.module.css';

type PreviewData = {
  file: string;
  scene: number;
  sceneCount: number;
  title: string;
  ir?: SceneIR;
  error?: string;
  mtime: number;
};

export default function DslPreview() {
  const params = useSearchParams();
  const router = useRouter();
  const file = params.get('file') ?? '';
  const scene = parseInt(params.get('scene') ?? '1', 10);

  const [data, setData] = useState<PreviewData | null>(null);
  const [input, setInput] = useState(file || '');
  const [live, setLive] = useState(false);
  const mtimeRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const go = useCallback(
    (n: number) => router.push(`/dsl-preview?file=${file}&scene=${n}`),
    [router, file]
  );

  useEffect(() => {
    if (!file) return;
    mtimeRef.current = 0;

    const poll = async () => {
      try {
        const res = await fetch(`/api/dsl-preview?file=${encodeURIComponent(file)}&scene=${scene}`);
        const d: PreviewData = await res.json();
        setLive(true);
        if (d.mtime !== mtimeRef.current) {
          mtimeRef.current = d.mtime;
          setData(d);
        }
      } catch {
        setLive(false);
      }
    };

    poll();
    const id = setInterval(poll, 500);
    return () => clearInterval(id);
  }, [file, scene]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowLeft' && data && data.scene > 1) go(data.scene - 1);
      if (e.key === 'ArrowRight' && data && data.scene < data.sceneCount) go(data.scene + 1);
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [data, go]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const f = input.trim();
    if (!f) return;
    inputRef.current?.blur();
    const name = f.endsWith('.dsl') ? f : `${f}.dsl`;
    router.push(`/dsl-preview?file=${name}&scene=1`);
  };

  const currentData = data?.file === file ? data : null;
  const hasPrev = currentData && currentData.scene > 1;
  const hasNext = currentData && currentData.scene < currentData.sceneCount;
  const isLive = file && live && !!currentData;

  return (
    <div className={s.container}>
      <div className={s.bar}>
        <div className={`${s.dot} ${!isLive ? s.dotOff : ''}`} />

        <form className={s.fileForm} onSubmit={submit}>
          <input
            ref={inputRef}
            className={s.fileInput}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="filename.dsl"
            spellCheck={false}
          />
        </form>

        {currentData && (
          <>
            <span className={s.sep}>/</span>
            <span className={`${s.title} ${currentData.error ? s.titleError : ''}`}>
              {currentData.title}
            </span>
            <div className={s.nav}>
              <span className={s.count}>
                {currentData.scene} / {currentData.sceneCount}
              </span>
              <button
                className={s.navBtn}
                onClick={() => go(currentData.scene - 1)}
                disabled={!hasPrev}
              >
                ←
              </button>
              <button
                className={s.navBtn}
                onClick={() => go(currentData.scene + 1)}
                disabled={!hasNext}
              >
                →
              </button>
            </div>
          </>
        )}
      </div>

      <div className={s.sceneWrap}>
        {!file && (
          <div className={s.empty}>
            <span className={s.emptyHint}>type a filename and press enter</span>
            <span className={s.emptySub}>files are read from prisma/lessons/</span>
          </div>
        )}
        {file && !currentData && (
          <div className={s.empty}>
            <span className={s.emptyLoading}>loading…</span>
          </div>
        )}
        {currentData?.error && (
          <div className={s.errorWrap}>
            <div className={s.errorBox}>
              <div className={s.errorLabel}>compile error</div>
              {currentData.error}
            </div>
          </div>
        )}
        {currentData?.ir && (
          <div className={s.sceneInner}>
            <Scene key={`${file}-${scene}-${currentData.mtime}`} ir={currentData.ir} />
          </div>
        )}
      </div>
    </div>
  );
}
