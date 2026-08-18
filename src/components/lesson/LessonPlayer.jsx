'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Sparkles, RotateCcw, Send, PencilLine } from 'lucide-react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LessonCompletion from '@/components/lesson/LessonCompletion';
import { askTutor, TutorError } from '@/utils/aiService';
import { evalGoals } from '@/engine/runtime/goals';
import {
  visiblePath,
  initialFlow,
  activeSlide,
  slideKey,
  canGoBack,
  stageBranch,
  next as nextFlow,
  back as backFlow,
} from '@/engine/runtime/flow';

import RichText from './RichText';
import SlideView from './SlideView';
import Scratchpad from './scratchpad/Scratchpad';
import useScratchpad from './scratchpad/useScratchpad';
import { exercises } from './exercises';

const PAD_KEY = 'mathly-scratchpad-open';

const getChecker = (s) => (s?.exercise ? (exercises[s.exercise.kind] ?? null) : null);

export default function LessonPlayer({
  slides = [],
  lessonId,
  coursePath = 'algebra',
  nextLessonId,
}) {
  const router = useRouter();

  const [flow, setFlow] = useState(() => initialFlow(0));
  const [slideDir, setSlideDir] = useState('right');
  const [answer, setAnswer] = useState(null);
  const [checked, setChecked] = useState(false);
  const [goalsState, setGoalsState] = useState({ slideId: null, met: [] });
  const [quizHistory, setQuizHistory] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [streak, setStreak] = useState(null);
  const [saveError, setSaveError] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  const [padOpen, setPadOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(PAD_KEY) === '1';
    } catch {
      return false;
    }
  });

  const [tutorOpen, setTutorOpen] = useState(false);
  const [tutorQuery, setTutorQuery] = useState('');
  const [tutorTurns, setTutorTurns] = useState([]);
  const [tutorStreaming, setTutorStreaming] = useState(false);
  const [tutorError, setTutorError] = useState(null);
  const scopeRef = useRef({});
  const transcriptRef = useRef(null);

  const path = useMemo(() => visiblePath(slides), [slides]);
  const slide = useMemo(() => activeSlide(slides, flow), [slides, flow]);
  const pathIndex = flow.pathIndex;
  const inDetour = Boolean(flow.detour);
  const currentKey = slideKey(flow);
  const isLast = !inDetour && pathIndex === path.length - 1;
  const checker = getChecker(slide);

  const pad = useScratchpad(lessonId, slide?.id, () => setSaveError(true));

  const [padFits, setPadFits] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setPadFits(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  const showPad = padOpen && padFits;

  const togglePad = () => {
    setPadOpen((open) => {
      const next = !open;
      try {
        localStorage.setItem(PAD_KEY, next ? '1' : '0');
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (!lessonId) return;
    fetch(`/api/progress?lessonKey=${lessonId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.currentStep > 0 && d.currentStep < path.length) setFlow(initialFlow(d.currentStep));
        if (d.completed) {
          setIsComplete(true);
          if (Array.isArray(d.quizHistory)) setQuizHistory(d.quizHistory);
        }
        setProgressLoaded(true);
      })
      .catch(() => setProgressLoaded(true));
  }, [lessonId, path.length]);

  const skipNextSaveRef = useRef(true);
  useEffect(() => {
    if (!progressLoaded || !lessonId) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonKey: lessonId,
        currentStep: pathIndex,
        isCompleted: false,
        quizHistory,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        setSaveError(false);
        if (d?.xp) setXpEarned((x) => x + d.xp);
      })
      .catch(() => setSaveError(true));
  }, [pathIndex, quizHistory, lessonId, progressLoaded]);

  useEffect(() => {
    fetch('/api/activity')
      .then((r) => r.json())
      .then((d) => {
        if (d.streak !== undefined) setStreak(d.streak);
      })
      .catch(console.error);
  }, []);

  const [resetForKey, setResetForKey] = useState(null);
  if (resetForKey !== currentKey) {
    setResetForKey(currentKey);
    setAnswer(checker ? checker.initial(slide) : null);
    setChecked(false);
    setTutorOpen(false);
    setTutorTurns([]);
    setTutorError(null);
    setTutorQuery('');
    scopeRef.current = {};
  }

  const markComplete = () => {
    fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    })
      .then(() =>
        fetch('/api/activity')
          .then((r) => r.json())
          .then((d) => {
            if (d.streak !== undefined) setStreak(d.streak);
          })
      )
      .catch(console.error);

    fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonKey: lessonId,
        currentStep: pathIndex,
        isCompleted: true,
        quizHistory,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        setSaveError(false);
        if (d?.xp) setXpEarned((x) => x + d.xp);
      })
      .catch(() => setSaveError(true));
  };

  const handleRetrySave = () => {
    fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonKey: lessonId,
        currentStep: pathIndex,
        isCompleted: isComplete,
        quizHistory,
      }),
    })
      .then(() => setSaveError(false))
      .catch(() => setSaveError(true));
  };

  // the old slide has to still be on screen to animate out, which only the view
  // transition api can do. without it the swap is instant, exactly as before.
  const runTransition = (dir, apply) => {
    if (typeof document === 'undefined' || typeof document.startViewTransition !== 'function') {
      setSlideDir(dir);
      apply();
      return;
    }
    const root = document.documentElement;
    root.dataset.slideDir = dir;
    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setSlideDir(dir);
        apply();
      });
    });
    transition.finished.finally(() => {
      delete root.dataset.slideDir;
    });
  };

  const handleNext = () => {
    const { state, complete } = nextFlow(slides, flow);
    runTransition(flow.detour?.retry ? 'left' : 'right', () => {
      setFlow(state);
      if (complete) setIsComplete(true);
    });
    if (complete) markComplete();
  };

  const handleBack = () => {
    runTransition('left', () => setFlow(backFlow(slides, flow)));
  };

  const handleCheck = () => {
    if (!checker) return;
    setChecked(true);
    const correct = checker.check(slide, answer);
    setFlow((f) => stageBranch(slides, f, correct));
    const question = slide.exercise?.prompt ?? slide.title ?? '';
    setQuizHistory((h) => {
      if (h.some((e) => e.slideId === slide.id)) return h;
      return [
        ...h,
        {
          title: slide.title,
          question,
          correct,
          slideId: slide.id,
          kind: slide.exercise?.kind,
          answer,
        },
      ];
    });
  };

  const handleAnswerChange = (val) => {
    setAnswer(val);
    setChecked(false);
  };

  const handleScopeChange = (scope) => {
    scopeRef.current = scope;
    const goals = slide?.goals;
    if (!goals?.length) return;
    setGoalsState((prev) => {
      const prevMet = prev.slideId === slide.id ? prev.met : [];
      return { slideId: slide.id, met: evalGoals(goals, prevMet, scope) };
    });
  };

  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [tutorTurns]);

  const handleTutorAsk = async () => {
    const question = tutorQuery.trim();
    if (!question || tutorStreaming || !slide) return;

    const history = tutorTurns;
    setTutorQuery('');
    setTutorError(null);
    setTutorTurns([
      ...history,
      { role: 'user', content: question },
      { role: 'assistant', content: '' },
    ]);
    setTutorStreaming(true);

    const land = (content) =>
      setTutorTurns((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content };
        return next;
      });

    try {
      await askTutor(
        {
          lessonKey: lessonId,
          slideId: slide.id,
          question,
          checked,
          ...(correct !== null && { correct }),
          answer,
          scope: scopeRef.current,
          history,
        },
        { onChunk: land }
      );
    } catch (err) {
      setTutorError(err instanceof TutorError ? err.message : 'Something went wrong. Try again.');
      setTutorTurns((prev) => prev.slice(0, -1));
    } finally {
      setTutorStreaming(false);
    }
  };

  const handleContinue = () =>
    router.push(nextLessonId ? `/courses/${coursePath}/${nextLessonId}` : `/courses/${coursePath}`);
  const handleBackToCourse = () => router.push(`/courses/${coursePath}`);

  const handleReset = () => {
    if (!confirm('Restart this lesson from the beginning? Your progress will be cleared.')) return;
    fetch(`/api/progress?lessonKey=${lessonId}`, { method: 'DELETE' }).catch(console.error);
    setFlow(initialFlow(0));
    setResetForKey(null);
    setQuizHistory([]);
    setIsComplete(false);
    setChecked(false);
    setAnswer(null);
    setSlideDir('right');
  };

  if (!path.length) {
    return (
      <div className="bg-app -mt-[var(--nav-h)] min-h-dvh pt-[var(--nav-h)] flex items-center justify-center">
        <Card className="animate-fade-in-up w-full max-w-4xl min-h-[500px] max-md:min-h-0 flex flex-col items-center justify-center p-8 text-center">
          <h2 className="text-2xl font-bold text-neutral-800 animate-pulse">Loading lesson...</h2>
          <p className="text-neutral-500 mt-2">Hang tight while we get things ready.</p>
          <Button onClick={handleBackToCourse} variant="ghost" className="mt-6">
            Back to Course
          </Button>
        </Card>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="bg-app -mt-[var(--nav-h)] min-h-dvh pt-[var(--nav-h)] flex items-center justify-center">
        <Card className="card-hero animate-fade-in-up w-full max-w-4xl min-h-[500px] max-md:min-h-0 rounded-3xl flex items-center justify-center">
          <LessonCompletion
            onContinue={handleContinue}
            onBack={handleBackToCourse}
            onRetake={handleReset}
            nextLessonId={nextLessonId}
            streak={streak}
            xpEarned={xpEarned}
            quizHistory={quizHistory}
          />
        </Card>
      </div>
    );
  }

  const goalsMet =
    goalsState.slideId === slide?.id ? goalsState.met : (slide?.goals ?? []).map(() => false);
  const goalsSatisfied = !slide?.goals?.length || goalsMet.every(Boolean);
  const canAdvance = (!checker || checked) && goalsSatisfied;
  const correct = checked && checker ? checker.check(slide, answer) : null;
  const nextLabel = flow.pending
    ? "Let's back up"
    : inDetour
      ? flow.detour.retry
        ? 'Try it again'
        : 'Got it'
      : isLast
        ? 'Complete!'
        : 'Continue';

  const restartButton = (
    <button
      onClick={handleReset}
      className="tap-target bg-white p-2.5 rounded-full border border-neutral-200 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center justify-center"
      title="Restart lesson"
      aria-label="Restart lesson"
    >
      <RotateCcw className="w-4 h-4" />
    </button>
  );

  const lessonChrome = (
    <>
      {streak !== null && (
        <div className="bg-white px-4 py-2 rounded-full border border-neutral-200 font-bold text-orange-500 flex items-center gap-2 card-soft">
          🔥 {streak} Day Streak
        </div>
      )}
      {restartButton}
    </>
  );

  const padButton = (
    <button
      onClick={togglePad}
      aria-pressed={showPad}
      title="Scratchpad"
      aria-label="Scratchpad"
      className={`relative hidden lg:block rounded-xl p-2 transition-colors hover:bg-primary-50 ${showPad ? 'bg-primary-50 text-primary-600' : 'text-neutral-400 hover:text-primary-600'}`}
    >
      <PencilLine className="h-5 w-5" />
      {pad.hasWork && !showPad && (
        <span className="absolute end-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary-500" />
      )}
    </button>
  );

  const mobileChrome = (
    <div className={`flex shrink-0 items-center gap-2 ${showPad ? '' : 'md:hidden'}`}>
      {streak !== null && (
        <div className="flex items-center rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-sm font-bold text-orange-500">
          🔥 {streak}
        </div>
      )}
      {restartButton}
    </div>
  );

  return (
    <div className="bg-app -mt-[var(--nav-h)] min-h-dvh px-4 pb-4 pt-[var(--nav-h)] md:px-6 md:pb-6 text-neutral-900 flex items-center justify-center selection:bg-primary-100 selection:text-primary-900 relative overflow-hidden max-md:px-0 max-md:pb-0 max-md:items-stretch max-md:overflow-visible">
      {saveError && (
        <div className="absolute start-4 top-[calc(var(--nav-h)+0.75rem)] flex items-center gap-2 bg-danger-50 border border-danger-100 text-danger-600 text-sm font-semibold px-4 py-2 rounded-full z-10 max-md:start-0 max-md:end-0 max-md:top-[var(--nav-h)] max-md:justify-center max-md:rounded-none">
          Couldn&apos;t save your progress.
          <button onClick={handleRetrySave} className="underline hover:no-underline">
            Retry
          </button>
        </div>
      )}
      {!showPad && (
        <div className="absolute end-4 top-[calc(var(--nav-h)+0.75rem)] flex items-center gap-2 z-10 max-md:hidden">
          {lessonChrome}
        </div>
      )}

      <div
        className={`card-hero animate-fade-in-up w-full ${showPad ? 'max-w-[80rem]' : 'max-w-4xl'} transition-[max-width] duration-300 bg-white rounded-3xl overflow-hidden border border-neutral-200/80 flex relative max-md:rounded-none max-md:border-0 max-md:h-[calc(100dvh-var(--nav-h))]`}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="pt-8 px-10 pb-2 flex items-center justify-between max-md:pt-4 max-md:px-4 max-md:gap-3">
            <div
              className="flex-1 mx-8 flex space-x-1 h-2 max-md:mx-0"
              role="progressbar"
              aria-label="Lesson progress"
              aria-valuemin={1}
              aria-valuemax={path.length}
              aria-valuenow={pathIndex + 1}
              aria-valuetext={
                inDetour
                  ? `Detour off slide ${pathIndex + 1} of ${path.length}`
                  : `Slide ${pathIndex + 1} of ${path.length}`
              }
            >
              {path.map((_, idx) => (
                <div
                  key={idx}
                  className={`flex-1 rounded-full transition-all duration-500 ${
                    inDetour && idx === pathIndex
                      ? 'bg-primary-200'
                      : idx <= pathIndex
                        ? 'bg-primary-500'
                        : 'bg-neutral-200'
                  }`}
                />
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {padButton}
              {mobileChrome}
            </div>
          </div>

          <div className="relative flex-1 overflow-y-auto px-10 py-6 max-md:px-4 max-md:py-4">
            <div
              key={currentKey}
              className={`slide-stage h-full flex flex-col ${slideDir === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}
            >
              <div className="mb-8">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-primary-500 font-bold text-sm tracking-wider uppercase">
                    {inDetour ? 'Quick detour' : slide?.category || 'Concept'}
                  </span>
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-bold leading-tight text-neutral-900 tracking-tight">
                  {slide?.title}
                </h1>
              </div>

              <div className="flex-1 w-full">
                <SlideView
                  slide={slide}
                  value={answer}
                  checked={checked}
                  correct={correct}
                  onChange={handleAnswerChange}
                  goalsMet={goalsMet}
                  onScopeChange={handleScopeChange}
                />
                <div aria-live="polite" className="sr-only">
                  {checked &&
                    correct !== null &&
                    (correct ? 'Correct.' : 'Not quite. Review the explanation and try again.')}
                </div>
              </div>
            </div>
          </div>

          <div className="px-10 py-6 border-t border-neutral-100 flex items-center justify-between gap-4 max-md:px-4 max-md:py-3 max-md:pb-[calc(0.75rem+var(--safe-b))]">
            <Button onClick={handleBack} variant="ghost" disabled={!canGoBack(flow)}>
              Back
            </Button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setTutorOpen((o) => !o)}
                className="text-neutral-400 hover:text-primary-600 transition-colors p-2 rounded-xl hover:bg-primary-50"
                title="Ask AI Tutor"
                aria-label="Ask AI Tutor"
              >
                <Sparkles className="w-5 h-5" />
              </button>

              {checker && !checked ? (
                <Button
                  onClick={handleCheck}
                  variant="primary"
                  disabled={!checker.isComplete(slide, answer)}
                >
                  Check
                </Button>
              ) : (
                <Button onClick={handleNext} variant="primary" disabled={!canAdvance}>
                  {nextLabel}
                </Button>
              )}
            </div>
          </div>

          <div
            className={`grid border-t border-neutral-100 bg-neutral-50/50 transition-[grid-template-rows] duration-300 ${tutorOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="p-6 max-md:p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary-500">
                    <Sparkles className="h-4 w-4" />
                    AI Tutor
                  </p>
                  {tutorTurns.length > 0 && !tutorStreaming && (
                    <button
                      onClick={() => {
                        setTutorTurns([]);
                        setTutorError(null);
                      }}
                      className="flex items-center gap-1 text-xs font-bold text-neutral-400 hover:text-primary-600"
                    >
                      <RotateCcw className="h-3 w-3" /> Start over
                    </button>
                  )}
                </div>

                {tutorTurns.length > 0 && (
                  <div
                    ref={transcriptRef}
                    className="mb-3 max-h-72 space-y-3 overflow-y-auto pe-1"
                    aria-live="polite"
                  >
                    {tutorTurns.map((turn, i) =>
                      turn.role === 'user' ? (
                        <p
                          key={i}
                          className="ms-auto w-fit max-w-[85%] rounded-2xl rounded-ee-sm bg-primary-600 px-4 py-2 text-sm font-medium text-white"
                        >
                          {turn.content}
                        </p>
                      ) : (
                        <div
                          key={i}
                          className="w-fit max-w-[92%] rounded-2xl rounded-es-sm border border-primary-100 bg-white px-4 py-3 text-sm leading-relaxed text-neutral-700"
                        >
                          {turn.content ? (
                            <RichText>{turn.content}</RichText>
                          ) : (
                            <span className="flex gap-1" aria-label="Thinking">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-400" />
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-400 [animation-delay:150ms]" />
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-400 [animation-delay:300ms]" />
                            </span>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}

                {tutorError && (
                  <p className="mb-3 text-sm font-medium text-danger-600" role="alert">
                    {tutorError}
                  </p>
                )}

                <div className="flex gap-2">
                  <input
                    value={tutorQuery}
                    onChange={(e) => setTutorQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTutorAsk()}
                    disabled={tutorStreaming}
                    placeholder={
                      tutorTurns.length ? 'Ask a follow up' : 'Stuck? Ask about this slide'
                    }
                    aria-label="Ask the tutor"
                    className="flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base sm:text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60"
                  />
                  <Button
                    onClick={handleTutorAsk}
                    variant="primary"
                    size="sm"
                    disabled={tutorStreaming || !tutorQuery.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showPad && (
          <Scratchpad
            slideId={slide?.id}
            notes={pad.notes}
            strokes={pad.strokes}
            onNotesChange={pad.setNotes}
            onStrokesChange={pad.setStrokes}
            onClose={togglePad}
          />
        )}
      </div>
    </div>
  );
}
