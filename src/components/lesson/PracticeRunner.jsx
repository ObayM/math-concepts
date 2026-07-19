'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import SlideView from '@/components/lesson/SlideView';
import { exercises } from '@/components/lesson/exercises';
import { evalGoals } from '@/engine/runtime/goals';

function pickRandom(pool, exclude) {
  if (pool.length === 1) return pool[0];
  let next;
  do {
    next = pool[Math.floor(Math.random() * pool.length)];
  } while (next === exclude);
  return next;
}

export default function PracticeRunner({ pool, coursePath, courseName }) {
  const router = useRouter();
  // picked client-side only — picking during the render that also runs on
  // the server would make the server and client disagree on Math.random()
  // and trigger a hydration mismatch
  const [slide, setSlide] = useState(null);
  const [value, setValue] = useState(null);
  const [checked, setChecked] = useState(false);
  const [goalsState, setGoalsState] = useState({ slideId: null, met: [] });
  const [stats, setStats] = useState({ attempted: 0, correct: 0 });
  const activityTouched = useRef(false);

  useEffect(() => {
    const first = pickRandom(pool);
    setSlide(first);
    setValue(exercises[first.exercise.kind].initial(first));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!slide) {
    return (
      <div className="min-h-[calc(100vh-var(--nav-h))] bg-surface flex items-center justify-center">
        <Card className="p-8">
          <p className="text-neutral-500 animate-pulse">Loading practice...</p>
        </Card>
      </div>
    );
  }

  const checker = exercises[slide.exercise.kind];
  const correct = checked ? checker.check(slide, value) : null;
  const goalsMet =
    goalsState.slideId === slide.id ? goalsState.met : (slide.goals ?? []).map(() => false);
  const goalsSatisfied = !slide.goals?.length || goalsMet.every(Boolean);

  const handleScopeChange = (scope) => {
    if (!slide.goals?.length) return;
    setGoalsState((prev) => {
      const prevMet = prev.slideId === slide.id ? prev.met : [];
      return { slideId: slide.id, met: evalGoals(slide.goals, prevMet, scope) };
    });
  };

  const handleChange = (v) => {
    setValue(v);
    setChecked(false);
  };

  const handleCheck = () => {
    const isCorrect = checker.check(slide, value);
    setChecked(true);
    setStats((s) => ({ attempted: s.attempted + 1, correct: s.correct + (isCorrect ? 1 : 0) }));
    if (!activityTouched.current) {
      activityTouched.current = true;
      fetch('/api/activity', { method: 'POST' }).catch(() => {});
    }
    if (slide.lessonKey) {
      fetch('/api/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonKey: slide.lessonKey, slideId: slide.id, answer: value }),
      }).catch(() => {});
    }
  };

  const handleNext = () => {
    const next = pickRandom(pool, slide);
    setSlide(next);
    setValue(exercises[next.exercise.kind].initial(next));
    setChecked(false);
  };

  return (
    <div className="min-h-[calc(100vh-var(--nav-h))] bg-surface p-4 md:p-6 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push(`/courses/${coursePath}`)}
            className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-700 font-bold text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {courseName}
          </button>
          <div className="bg-white px-4 py-2 rounded-full border border-neutral-200 font-bold text-sm text-neutral-500">
            {stats.correct} / {stats.attempted} correct
          </div>
        </div>

        <Card className="animate-fade-in-up p-8 md:p-10">
          <div key={slide.id} className="animate-slide-in-right">
            <div className="mb-6">
              <span className="text-neutral-400 font-bold text-sm tracking-wider uppercase">
                {slide.category || courseName}
              </span>
              {slide.title && (
                <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight mt-1">
                  {slide.title}
                </h1>
              )}
            </div>

            <SlideView
              slide={slide}
              value={value}
              checked={checked}
              correct={correct}
              onChange={handleChange}
              goalsMet={goalsMet}
              onScopeChange={handleScopeChange}
            />
          </div>

          <div className="mt-8 pt-6 border-t border-neutral-100 flex justify-end">
            {!checked ? (
              <Button
                onClick={handleCheck}
                variant="success"
                disabled={!checker.isComplete(slide, value)}
              >
                Check
              </Button>
            ) : (
              <Button onClick={handleNext} variant="success" disabled={!goalsSatisfied}>
                Next
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
