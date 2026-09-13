'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, Pen, Trash2, Undo2 } from 'lucide-react';

import { drawStrokes, eraseAt, fromGrid, toGrid } from './strokes';
import { useT } from '@/components/i18n/LocaleProvider';

const SAMPLE_PX = 3;
const PEN_WIDTH = 2.5;
const ERASER_RADIUS = 12;
const MAX_UNDO = 30;
const INK = '#1e293b';

export default function DrawPad({ strokes, onChange }) {
  const t = useT();
  const [tool, setTool] = useState('pen');
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const widthRef = useRef(1);
  const undoRef = useRef([]);
  const [canUndo, setCanUndo] = useState(false);

  const strokesRef = useRef(strokes);

  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const w = widthRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawStrokes(ctx, strokesRef.current, w, { color: INK, lineWidth: PEN_WIDTH });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const resize = () => {
      const { width, height } = wrap.getBoundingClientRect();
      const ctx = canvas.getContext('2d');
      if (!width || !height || !ctx) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      widthRef.current = width;
      repaint();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [repaint]);

  useEffect(() => {
    strokesRef.current = strokes;
    repaint();
  }, [strokes, repaint]);

  const pushUndo = () => {
    undoRef.current = [...undoRef.current, strokesRef.current].slice(-MAX_UNDO);
    setCanUndo(true);
  };

  const undo = () => {
    const stack = undoRef.current;
    if (!stack.length) return;
    undoRef.current = stack.slice(0, -1);
    setCanUndo(undoRef.current.length > 0);
    onChange(stack[stack.length - 1]);
  };

  const clear = () => {
    if (!strokes.length) return;
    pushUndo();
    onChange([]);
  };

  const localPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return toGrid(e.clientX - rect.left, e.clientY - rect.top, widthRef.current);
  };

  const handleDown = (e) => {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    pushUndo();

    const w = widthRef.current;

    if (tool === 'eraser') {
      const radius = (ERASER_RADIUS / w) * 1000;
      const erase = (ev) => {
        const [gx, gy] = localPoint(ev);
        const next = eraseAt(strokesRef.current, gx, gy, radius);
        if (next.length !== strokesRef.current.length) onChange(next);
      };
      erase(e);
      const up = () => {
        window.removeEventListener('pointermove', erase);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
      };
      window.addEventListener('pointermove', erase);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
      return;
    }

    const ctx = canvasRef.current.getContext('2d');
    const draft = [localPoint(e)];
    let lastScreen = { x: e.clientX, y: e.clientY };

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK;
    ctx.lineWidth = PEN_WIDTH;

    const move = (ev) => {
      if (Math.hypot(ev.clientX - lastScreen.x, ev.clientY - lastScreen.y) < SAMPLE_PX) return;
      lastScreen = { x: ev.clientX, y: ev.clientY };
      const p = localPoint(ev);
      const prev = draft[draft.length - 1];
      draft.push(p);
      ctx.beginPath();
      ctx.moveTo(...fromGrid(prev[0], prev[1], widthRef.current));
      ctx.lineTo(...fromGrid(p[0], p[1], widthRef.current));
      ctx.stroke();
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      onChange([...strokesRef.current, { points: draft }]);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const toolButton = (id, Icon, label) => (
    <button
      onClick={() => setTool(id)}
      aria-label={label}
      aria-pressed={tool === id}
      title={label}
      className={`rounded-lg p-2 transition-colors ${
        tool === id
          ? 'bg-primary-100 text-primary-600'
          : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600'
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-center gap-1">
        {toolButton('pen', Pen, 'Pen')}
        {toolButton('eraser', Eraser, 'Eraser')}
        <div className="mx-1 h-5 w-px bg-neutral-200" />
        <button
          onClick={undo}
          disabled={!canUndo}
          aria-label="Undo"
          title="Undo"
          className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 disabled:pointer-events-none disabled:opacity-40"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          onClick={clear}
          disabled={!strokes.length}
          className="ms-auto flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold text-neutral-400 transition-colors hover:bg-danger-50 hover:text-danger-600 disabled:pointer-events-none disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>

      <div
        ref={wrapRef}
        className="bg-grid-pad relative min-h-0 flex-1 overflow-hidden rounded-xl border border-neutral-200"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handleDown}
          role="application"
          aria-label={t('lesson.drawingArea')}
          className={`absolute inset-0 ${tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'}`}
          style={{ touchAction: 'none' }}
        />
      </div>
    </div>
  );
}
