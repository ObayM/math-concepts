'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, RotateCcw, BrainCircuit } from 'lucide-react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LessonCompletion from '@/components/lesson/LessonCompletion';
import { askTutor } from '@/utils/aiService';
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

import SlideView from './SlideView';
import { exercises } from './exercises';

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

  const [tutorOpen, setTutorOpen] = useState(false);
  const [tutorQuery, setTutorQuery] = useState('');
  const [tutorResponse, setTutorResponse] = useState('');
  const [tutorLoading, setTutorLoading] = useState(false);

  const path = useMemo(() => visiblePath(slides), [slides]);
  const slide = useMemo(() => activeSlide(slides, flow), [slides, flow]);
  const pathIndex = flow.pathIndex;
  const inDetour = Boolean(flow.detour);
  const currentKey = slideKey(flow);
  const isLast = !inDetour && pathIndex === path.length - 1;
  const checker = getChecker(slide);

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
    setTutorResponse('');
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

  const handleNext = () => {
    const { state, complete } = nextFlow(slides, flow);
    setSlideDir(flow.detour?.retry ? 'left' : 'right');
    setFlow(state);
    if (complete) {
      markComplete();
      setIsComplete(true);
    }
  };

  const handleBack = () => {
    setSlideDir('left');
    setFlow(backFlow(slides, flow));
  };

  const handleCheck = () => {
    if (!checker) return;
    setChecked(true);
    const correct = checker.check(slide, answer);
    setFlow((f) => stageBranch(slides, f, correct));
    const question = slide.exercise?.prompt ?? slide.content ?? '';
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
    const goals = slide?.goals;
    if (!goals?.length) return;
    setGoalsState((prev) => {
      const prevMet = prev.slideId === slide.id ? prev.met : [];
      return { slideId: slide.id, met: evalGoals(goals, prevMet, scope) };
    });
  };

  const handleTutorAsk = async () => {
    if (!tutorQuery.trim()) return;
    setTutorLoading(true);
    const context = slide.content ?? slide.prose ?? slide.exercise?.prompt ?? slide.title;
    const reply = await askTutor(context, tutorQuery);
    setTutorResponse(reply);
    setTutorLoading(false);
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
      <div className="bg-app -mt-[var(--nav-h)] min-h-screen pt-[var(--nav-h)] flex items-center justify-center">
        <Card className="animate-fade-in-up w-full max-w-4xl min-h-[500px] flex flex-col items-center justify-center p-8 text-center">
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
      <div className="bg-app -mt-[var(--nav-h)] min-h-screen pt-[var(--nav-h)] flex items-center justify-center">
        <Card className="card-hero animate-fade-in-up w-full max-w-4xl min-h-[500px] rounded-3xl flex items-center justify-center">
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

  return (
    <div className="bg-app -mt-[var(--nav-h)] min-h-screen px-4 pb-4 pt-[var(--nav-h)] md:px-6 md:pb-6 text-neutral-900 flex items-center justify-center selection:bg-primary-100 selection:text-primary-900 relative overflow-hidden">
      {saveError && (
        <div className="absolute left-4 top-[calc(var(--nav-h)+0.75rem)] flex items-center gap-2 bg-danger-50 border border-danger-100 text-danger-600 text-sm font-semibold px-4 py-2 rounded-full z-10">
          Couldn&apos;t save your progress.
          <button onClick={handleRetrySave} className="underline hover:no-underline">
            Retry
          </button>
        </div>
      )}
      <div className="absolute right-4 top-[calc(var(--nav-h)+0.75rem)] flex items-center gap-2 z-10">
        {streak !== null && (
          <div className="bg-white px-4 py-2 rounded-full border border-neutral-200 font-bold text-orange-500 flex items-center gap-2 card-soft">
            🔥 {streak} Day Streak
          </div>
        )}
        <button
          onClick={handleReset}
          className="bg-white p-2.5 rounded-full border border-neutral-200 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 transition-colors"
          title="Restart lesson"
          aria-label="Restart lesson"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="card-hero animate-fade-in-up w-full max-w-4xl bg-white rounded-3xl overflow-hidden border border-neutral-200/80 flex flex-col relative">
        <div className="pt-8 px-10 pb-2 flex items-center justify-between">
          <div
            className="flex-1 mx-8 flex space-x-1 h-2"
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
        </div>

        <div className="flex-1 px-10 py-6 overflow-hidden relative">
          <div
            key={currentKey}
            className={`h-full flex flex-col ${slideDir === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}
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

        <div className="px-10 py-6 border-t border-neutral-100 flex items-center justify-between gap-4">
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
          className={`border-t border-neutral-100 bg-neutral-50/50 transition-all duration-300 ${tutorOpen ? 'h-auto' : 'h-0 overflow-hidden'}`}
        >
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary-600 p-2 rounded-xl text-white">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-primary-500 uppercase mb-2">AI Math Tutor</p>

                {tutorResponse ? (
                  <div className="animate-fade-in-up bg-white p-4 rounded-2xl border border-primary-100 text-neutral-700 text-sm leading-relaxed">
                    {tutorResponse}
                    <div className="mt-3 pt-3 border-t border-neutral-100 flex justify-end">
                      <button
                        onClick={() => setTutorResponse('')}
                        className="text-xs font-bold text-primary-600 flex items-center hover:underline"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" /> Ask new question
                      </button>
                    </div>
                  </div>
                ) : tutorLoading ? (
                  <div className="flex items-center gap-3 text-neutral-500 text-sm">
                    <BrainCircuit className="w-5 h-5 text-primary-500 animate-pulse" />
                    Thinking...
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={tutorQuery}
                      onChange={(e) => setTutorQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleTutorAsk()}
                      placeholder="e.g. Why is symmetry important?"
                      className="flex-1 bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                    <Button onClick={handleTutorAsk} variant="primary" size="sm">
                      Ask
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
