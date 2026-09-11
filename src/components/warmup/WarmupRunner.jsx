'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Flame, Check, X } from 'lucide-react';
import clsx from 'clsx';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Keypad from '@/components/warmup/Keypad';
import StopScreen from '@/components/warmup/StopScreen';
import { questionAt } from '@/lib/warmup/questions';
import { gradeAnswer } from '@/lib/warmup/grade';
import { accuracyPct, formatDuration } from '@/lib/warmup/stats';
import { useT } from '@/components/i18n/LocaleProvider';

const FLUSH_EVERY = 10;
const FLUSH_AFTER_MS = 10_000;
const CORRECT_HOLD_MS = 260;
const MAX_DIGITS = 6;
const SESSION_CAP = 500;

const EMPTY_STATS = { answered: 0, correct: 0, streak: 0, bestStreak: 0, totalMs: 0 };

export default function WarmupRunner({ level, levelName, levelBlurb }) {
  const t = useT();
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState('starting');
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState('');
  const [verdict, setVerdict] = useState(null);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [xpEarned, setXpEarned] = useState(0);
  const [capped, setCapped] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [touch, setTouch] = useState(false);

  const sessionRef = useRef(null);
  const bufferRef = useRef([]);
  const askedAtRef = useRef(0);
  const sittingStartRef = useRef(0);
  const holdRef = useRef(null);
  const inputRef = useRef(null);

  const question = useMemo(
    () => (session ? questionAt(level, session.seed, idx) : null),
    [session, level, idx]
  );

  const beginSession = useCallback(async () => {
    const res = await fetch('/api/warmup/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });
    if (!res.ok) throw new Error('could not start');
    const data = await res.json();
    return { sessionId: data.sessionId, seed: data.seed };
  }, [level]);

  const flush = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return;
    const batch = bufferRef.current.splice(0, bufferRef.current.length);
    if (!batch.length) return;
    const expected = batch.filter((a) => a.wasCorrect).length;
    try {
      const res = await fetch('/api/warmup/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: current.sessionId,
          answers: batch.map(({ idx: i, given, elapsedMs }) => ({ idx: i, given, elapsedMs })),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const paid = data?.session?.xp ?? 0;
      if (paid > 0) setXpEarned((xp) => xp + paid);
      if (expected > 0 && paid === 0) setCapped(true);
      setSaveError(false);
    } catch {
      bufferRef.current.unshift(...batch);
      setSaveError(true);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    beginSession()
      .then((started) => {
        if (!alive) return;
        sessionRef.current = started;
        sittingStartRef.current = performance.now();
        askedAtRef.current = performance.now();
        setSession(started);
        setStatus('running');
      })
      .catch(() => {
        if (alive) setStatus('error');
      });
    return () => {
      alive = false;
    };
  }, [beginSession]);

  useEffect(() => {
    if (status !== 'running') return;
    const timer = setInterval(() => flush(), FLUSH_AFTER_MS);
    return () => clearInterval(timer);
  }, [status, flush]);

  useEffect(() => {
    if (status !== 'running') return;
    const tick = setInterval(() => {
      setElapsed(performance.now() - sittingStartRef.current);
    }, 500);
    return () => clearInterval(tick);
  }, [status]);

  useEffect(() => {
    const drain = () => {
      const current = sessionRef.current;
      const batch = bufferRef.current.splice(0, bufferRef.current.length);
      if (!current || !batch.length) return;
      const body = JSON.stringify({
        sessionId: current.sessionId,
        answers: batch.map(({ idx: i, given, elapsedMs }) => ({ idx: i, given, elapsedMs })),
      });
      navigator.sendBeacon?.('/api/warmup/answers', new Blob([body], { type: 'application/json' }));
    };
    window.addEventListener('pagehide', drain);
    return () => {
      window.removeEventListener('pagehide', drain);
      drain();
    };
  }, []);

  useEffect(() => {
    setTouch(Boolean(window.matchMedia?.('(pointer: coarse)').matches));
  }, []);

  useEffect(() => {
    if (status === 'running' && !verdict) inputRef.current?.focus();
  }, [status, verdict, idx]);

  useEffect(() => () => clearTimeout(holdRef.current), []);

  const advance = useCallback(() => {
    clearTimeout(holdRef.current);
    setVerdict(null);
    setValue('');
    askedAtRef.current = performance.now();
    setIdx((i) => i + 1);
  }, []);

  const rollSession = useCallback(async () => {
    await flush();
    const previous = sessionRef.current;
    if (previous) {
      fetch('/api/warmup/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: previous.sessionId }),
      }).catch(() => {});
    }
    const started = await beginSession();
    sessionRef.current = started;
    setSession(started);
    setIdx(0);
    setValue('');
    setVerdict(null);
    askedAtRef.current = performance.now();
  }, [flush, beginSession]);

  const submit = useCallback(() => {
    if (!question || verdict) return;
    const given = value.trim();
    if (!given || given === '-') return;

    const wasCorrect = gradeAnswer(question, given);
    const elapsedMs = Math.round(performance.now() - askedAtRef.current);

    bufferRef.current.push({ idx, given, elapsedMs, wasCorrect });
    setStats((s) => {
      const streak = wasCorrect ? s.streak + 1 : 0;
      return {
        answered: s.answered + 1,
        correct: s.correct + (wasCorrect ? 1 : 0),
        streak,
        bestStreak: Math.max(s.bestStreak, streak),
        totalMs: s.totalMs + elapsedMs,
      };
    });
    setVerdict({ correct: wasCorrect, answer: question.answer });

    if (bufferRef.current.length >= FLUSH_EVERY) flush();
    if (wasCorrect) holdRef.current = setTimeout(advance, CORRECT_HOLD_MS);
  }, [question, verdict, value, idx, flush, advance]);

  const stop = useCallback(async () => {
    clearTimeout(holdRef.current);
    setStatus('stopping');
    await flush();
    const current = sessionRef.current;
    if (current) {
      await fetch('/api/warmup/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: current.sessionId }),
      }).catch(() => {});
    }
    setElapsed(performance.now() - sittingStartRef.current);
    setStatus('stopped');
  }, [flush]);

  const goAgain = useCallback(async () => {
    setStats(EMPTY_STATS);
    setXpEarned(0);
    setCapped(false);
    setElapsed(0);
    setStatus('starting');
    try {
      const started = await beginSession();
      sessionRef.current = started;
      sittingStartRef.current = performance.now();
      askedAtRef.current = performance.now();
      setSession(started);
      setIdx(0);
      setValue('');
      setVerdict(null);
      setStatus('running');
    } catch {
      setStatus('error');
    }
  }, [beginSession]);

  const press = useCallback(
    (key) => {
      if (verdict) {
        if (key === 'enter' && !verdict.correct) advance();
        return;
      }
      if (key === 'enter') return submit();
      if (key === 'back') return setValue((v) => v.slice(0, -1));
      if (key === '-') return setValue((v) => (v.startsWith('-') ? v.slice(1) : `-${v}`));
      setValue((v) => (v.replace('-', '').length >= MAX_DIGITS ? v : v + key));
    },
    [verdict, advance, submit]
  );

  const onKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (verdict) {
        if (!verdict.correct) advance();
      } else {
        submit();
      }
    }
  };

  useEffect(() => {
    if (idx >= SESSION_CAP) rollSession().catch(() => setStatus('error'));
  }, [idx, rollSession]);

  if (status === 'error') {
    return (
      <div className="bg-app -mt-[var(--nav-h)] flex min-h-dvh items-center justify-center pt-[var(--nav-h)]">
        <Card className="card-soft p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-neutral-900">
            {t('warmup.couldNotStart')}
          </h1>
          <p className="mt-2 text-neutral-500">
            Something went wrong setting up the drill. Try again in a moment.
          </p>
          <Button as={Link} href="/warmup" variant="secondary" className="mt-6 inline-flex">
            Back to levels
          </Button>
        </Card>
      </div>
    );
  }

  if (status === 'stopped') {
    return (
      <div className="bg-app -mt-[var(--nav-h)] flex min-h-dvh items-center justify-center px-4 pb-[calc(1rem+var(--safe-b))] pt-[calc(var(--nav-h)+1rem)] md:px-6">
        <StopScreen
          stats={{ ...stats, sittingMs: elapsed }}
          xpEarned={xpEarned}
          capped={capped}
          levelName={levelName}
          onAgain={goAgain}
        />
      </div>
    );
  }

  if (!question) {
    return (
      <div className="bg-app -mt-[var(--nav-h)] flex min-h-dvh items-center justify-center pt-[var(--nav-h)]">
        <p className="animate-pulse font-bold text-neutral-400">{t('warmup.warmingUp')}</p>
      </div>
    );
  }

  const boxTone = !verdict
    ? 'border-neutral-200 bg-neutral-50 text-neutral-900'
    : verdict.correct
      ? 'border-success-500 bg-success-50 text-success-800'
      : 'border-danger-500 bg-danger-50 text-danger-600';

  return (
    <div className="bg-app -mt-[var(--nav-h)] flex h-dvh justify-center overflow-hidden pt-[var(--nav-h)] md:items-center md:px-6 md:pb-6 md:pt-[calc(var(--nav-h)+1.5rem)]">
      <Card className="card-hero flex w-full max-w-lg flex-1 flex-col rounded-3xl px-4 pb-[calc(0.5rem+var(--safe-b))] max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:shadow-none md:max-h-full md:flex-none md:min-h-[27rem] md:px-8 md:pb-7 md:pt-4">
        <div className="flex shrink-0 items-center justify-between py-2.5">
          <Link
            href="/warmup"
            className="tap-target-h flex items-center gap-1.5 text-sm font-bold text-neutral-500 transition-colors hover:text-neutral-700"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            <span className="max-sm:hidden">{t('warmup.levels')}</span>
          </Link>
          <p className="text-sm font-bold text-neutral-400">{levelName}</p>
          <button
            type="button"
            onClick={stop}
            className="tap-target-h rounded-lg px-3 text-sm font-bold text-neutral-500 transition-colors hover:text-neutral-800"
          >
            {t('warmup.stop')}
          </button>
        </div>

        <div className="flex shrink-0 items-center justify-center gap-4 text-sm font-bold tabular-nums text-neutral-500">
          <span
            className={clsx('flex items-center gap-1', stats.streak >= 3 && 'text-warning-600')}
          >
            <Flame className="h-4 w-4" aria-hidden />
            {stats.streak}
          </span>
          <span aria-hidden className="text-neutral-200">
            |
          </span>
          <span>
            {stats.correct}/{stats.answered}
          </span>
          {stats.answered > 0 && (
            <>
              <span aria-hidden className="text-neutral-200">
                |
              </span>
              <span>{accuracyPct(stats.correct, stats.answered)}%</span>
            </>
          )}
          <span aria-hidden className="text-neutral-200">
            |
          </span>
          <span>{formatDuration(elapsed)}</span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-2 md:py-8">
          <p
            key={question.prompt + idx}
            className="font-display animate-pop-in text-center text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl md:text-6xl"
          >
            {question.prompt}
          </p>

          <div
            className={clsx(
              'mt-6 flex h-16 w-full max-w-[15rem] items-center justify-center rounded-2xl border-2 text-4xl font-extrabold tabular-nums transition-colors sm:h-20',
              boxTone
            )}
          >
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/[^\d-]/g, '').slice(0, 7))}
              onKeyDown={onKeyDown}
              readOnly={Boolean(verdict) || touch}
              inputMode="none"
              autoComplete="off"
              placeholder="?"
              aria-label={`Answer for ${question.prompt}`}
              className="w-full bg-transparent text-center outline-none placeholder:text-neutral-300"
            />
          </div>

          <div className="mt-3 flex h-6 shrink-0 items-center justify-center">
            {verdict?.correct && (
              <span className="flex items-center gap-1.5 font-bold text-success-600">
                <Check className="h-5 w-5" aria-hidden />
                Nice
              </span>
            )}
            {verdict && !verdict.correct && (
              <span className="flex items-center gap-1.5 font-bold text-danger-600">
                <X className="h-5 w-5" aria-hidden />
                it&apos;s {verdict.answer}
              </span>
            )}
          </div>
        </div>

        {touch ? (
          <div className="shrink-0">
            <Keypad
              onPress={press}
              submitLabel={verdict && !verdict.correct ? t('warmup.next') : t('warmup.check')}
            />
          </div>
        ) : (
          <div className="shrink-0">
            {verdict && !verdict.correct ? (
              <Button onClick={advance} variant="primary" fullWidth>
                {t('warmup.next')}
              </Button>
            ) : (
              <Button onClick={submit} variant="primary" fullWidth disabled={Boolean(verdict)}>
                {t('warmup.check')}
              </Button>
            )}
            <p className="mt-3 text-center text-xs text-neutral-400">
              {levelBlurb} {t('warmup.pressEnter')}
            </p>
          </div>
        )}

        {saveError && (
          <p className="mt-3 text-center text-xs font-bold text-warning-600">
            Not saving right now. Your answers are queued and will go up when the connection
            returns.
          </p>
        )}
      </Card>
    </div>
  );
}
