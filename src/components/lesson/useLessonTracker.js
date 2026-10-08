'use client';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  CONTROL_TICK_MS,
  MAX_BATCH,
  MAX_BUFFER,
  chunk,
  idleSince,
  pauseDwell,
  readDwell,
  resumeDwell,
  startDwell,
} from '@/lib/tracker-core';

const ENDPOINT = '/api/events';
const FLUSH_AFTER_MS = 10_000;
const IDLE_POLL_MS = 5_000;
const INPUTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'];

const newSessionId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const retryable = (status) => status === 429 || status >= 500;

export default function useLessonTracker(lessonKey) {
  const sessionRef = useRef(null);
  const bufferRef = useRef([]);
  const slideRef = useRef(null);
  const lastInputRef = useRef(0);
  const idleRef = useRef(false);
  const hiddenRef = useRef(false);
  const checksRef = useRef(new Map());

  const push = useCallback((type, slideId, data) => {
    const buffer = bufferRef.current;
    buffer.push({ type, slideId: slideId ?? null, t: Date.now(), ...(data && { data }) });
    if (buffer.length > MAX_BUFFER) buffer.splice(0, buffer.length - MAX_BUFFER);
  }, []);

  const body = useCallback(
    (events) => JSON.stringify({ lessonKey, sessionId: sessionRef.current, events }),
    [lessonKey]
  );

  const flush = useCallback(async () => {
    if (!lessonKey || !sessionRef.current) return;
    const batch = bufferRef.current.splice(0, MAX_BATCH);
    if (!batch.length) return;
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body(batch),
      });
      if (retryable(res.status)) bufferRef.current.unshift(...batch);
    } catch {
      bufferRef.current.unshift(...batch);
    }
  }, [lessonKey, body]);

  const drain = useCallback(() => {
    if (!lessonKey || !sessionRef.current) return;
    const all = bufferRef.current.splice(0, bufferRef.current.length);
    for (const batch of chunk(all, MAX_BATCH)) {
      const blob = new Blob([body(batch)], { type: 'application/json' });
      if (!navigator.sendBeacon?.(ENDPOINT, blob)) bufferRef.current.push(...batch);
    }
  }, [lessonKey, body]);

  const leaveSlide = useCallback(
    (now) => {
      const s = slideRef.current;
      if (!s) return;
      push('slide_leave', s.id, { ...readDwell(s.dwell, now), controls: s.controls });
      slideRef.current = null;
    },
    [push]
  );

  const enterSlide = useCallback(
    (slideId, data) => {
      const now = Date.now();
      leaveSlide(now);
      const dwell = startDwell(now);
      slideRef.current = {
        id: slideId,
        dwell: idleRef.current || hiddenRef.current ? pauseDwell(dwell, now) : dwell,
        controls: 0,
        lastTick: 0,
      };
      push('slide_enter', slideId, data);
    },
    [leaveSlide, push]
  );

  const track = useCallback(
    (type, slideId, data) => {
      if (type === 'check') {
        const attempt = (checksRef.current.get(slideId) ?? 0) + 1;
        checksRef.current.set(slideId, attempt);
        data = { ...data, attempt };
      }
      if (type === 'complete') leaveSlide(Date.now());
      push(type, slideId, data);
    },
    [push, leaveSlide]
  );

  const control = useCallback(() => {
    const s = slideRef.current;
    const now = Date.now();
    if (!s || now - lastInputRef.current > 1000 || now - s.lastTick < CONTROL_TICK_MS) return;
    s.lastTick = now;
    s.controls += 1;
  }, []);

  useEffect(() => {
    if (!lessonKey) return;
    sessionRef.current = newSessionId();
    lastInputRef.current = Date.now();
    push('lesson_open', null);

    const onInput = () => {
      const now = Date.now();
      lastInputRef.current = now;
      if (!idleRef.current || hiddenRef.current) return;
      idleRef.current = false;
      const s = slideRef.current;
      if (s) s.dwell = resumeDwell(s.dwell, now);
      push('active', s?.id);
    };

    const onVisibility = () => {
      const now = Date.now();
      const s = slideRef.current;
      if (document.visibilityState === 'hidden') {
        if (hiddenRef.current) return;
        hiddenRef.current = true;
        if (s) s.dwell = pauseDwell(s.dwell, now);
        push('hidden', s?.id);
        drain();
        return;
      }
      if (!hiddenRef.current) return;
      hiddenRef.current = false;
      idleRef.current = false;
      lastInputRef.current = now;
      if (s) s.dwell = resumeDwell(s.dwell, now);
      push('visible', s?.id);
    };

    const onPageHide = () => {
      leaveSlide(Date.now());
      push('lesson_close', null);
      drain();
    };

    const idleTimer = setInterval(() => {
      if (idleRef.current || hiddenRef.current) return;
      const at = idleSince(lastInputRef.current, Date.now());
      if (at === null) return;
      idleRef.current = true;
      const s = slideRef.current;
      if (s) s.dwell = pauseDwell(s.dwell, at);
      push('idle', s?.id);
    }, IDLE_POLL_MS);
    const flushTimer = setInterval(flush, FLUSH_AFTER_MS);

    for (const name of INPUTS) window.addEventListener(name, onInput, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      clearInterval(idleTimer);
      clearInterval(flushTimer);
      for (const name of INPUTS) window.removeEventListener(name, onInput);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      onPageHide();
    };
  }, [lessonKey, push, flush, drain, leaveSlide]);

  return useMemo(() => ({ track, enterSlide, control }), [track, enterSlide, control]);
}
