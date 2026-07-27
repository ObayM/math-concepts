'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import SlideView from '@/components/lesson/SlideView';
import { exercises } from '@/components/lesson/exercises';
import { evalGoals } from '@/engine/runtime/goals';
import { weightedPick, slideSkill } from '@/lib/practice';

const SESSION_LENGTH = 10;

export default function PracticeRunner({ pool, mastery = {}, coursePath, courseName }) {
  const router = useRouter();
  // picked client-side only — picking during the render that also runs on
  // the server would make the server and client disagree on Math.random()
  // and trigger a hydration mismatch
  const [slide, setSlide] = useState(null);
  const [value, setValue] = useState(null);
  const [checked, setChecked] = useState(false);
  const [goalsState, setGoalsState] = useState({ slideId: null, met: [] });
  const [stats, setStats] = useState({ attempted: 0, correct: 0 });
  const [done, setDone] = useState(false);
  const liveMastery = useRef({ ...mastery });
  const activityTouched = useRef(false);

  useEffect(() => {
    const first = weightedPick(pool, liveMastery.current);
    setSlide(first);
    setValue(exercises[first.exercise.kind].initial(first));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!slide) {
    return (
      <div className="bg-app -mt-[var(--nav-h)] min-h-screen pt-[var(--nav-h)] flex items-center justify-center">
        <Card className="card-soft p-8">
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

    const skill = slideSkill(slide);
    if (skill) {
      const prev = liveMastery.current[skill] ?? 0;
      liveMastery.current[skill] = prev * 0.7 + (isCorrect ? 1 : 0) * 0.3;
    }

    if (!activityTouched.current) {
      activityTouched.current = true;
      fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      }).catch(() => {});
    }
    if (slide.lessonKey) {
      fetch('/api/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonKey: slide.lessonKey, slideId: slide.id, answer: value }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (typeof d?.correct === 'boolean' && d.correct !== isCorrect) {
            setStats((s) => ({ ...s, correct: s.correct + (d.correct ? 1 : -1) }));
          }
        })
        .catch(() => {});
    }
  };

  const handleNext = () => {
    if (stats.attempted >= SESSION_LENGTH) {
      setDone(true);
      return;
    }
    const next = weightedPick(pool, liveMastery.current, Math.random, slide);
    setSlide(next);
    setValue(exercises[next.exercise.kind].initial(next));
    setChecked(false);
  };

  const handleAgain = () => {
    setStats({ attempted: 0, correct: 0 });
    setDone(false);
    setChecked(false);
    const next = weightedPick(pool, liveMastery.current, Math.random, slide);
    setSlide(next);
    setValue(exercises[next.exercise.kind].initial(next));
  };

  if (done) {
    const pct = stats.attempted ? Math.round((stats.correct / stats.attempted) * 100) : 0;
    return (
      <div className="bg-app -mt-[var(--nav-h)] min-h-screen px-4 pb-4 pt-[var(--nav-h)] md:px-6 md:pb-6 flex items-center justify-center">
        <Card className="card-hero animate-fade-in-up rounded-3xl p-10 w-full max-w-lg text-center">
          <p className="text-primary-500 font-bold text-sm tracking-wider uppercase mb-3">
            Session done
          </p>
          <h1 className="font-display text-4xl font-bold text-neutral-900 tracking-tight mb-2">
            {stats.correct} out of {stats.attempted}
          </h1>
          <p className="text-neutral-500 mb-8">
            {pct >= 80
              ? 'Sharp work. That stuff is sticking.'
              : pct >= 50
                ? 'Solid middle ground. Another round will tighten it up.'
                : 'Rough round, but this is exactly where the practice pays off.'}
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={handleAgain} variant="primary">
              Go again
            </Button>
            <Button onClick={() => router.push(`/courses/${coursePath}`)} variant="ghost">
              Back to {courseName}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-app -mt-[var(--nav-h)] min-h-screen px-4 pb-4 pt-[var(--nav-h)] md:px-6 md:pb-6 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push(`/courses/${coursePath}`)}
            className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-700 font-bold text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {courseName}
          </button>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {Array.from({ length: SESSION_LENGTH }, (_, i) => (
                <div
                  key={i}
                  className={`h-2 w-4 rounded-full transition-colors ${i < stats.attempted ? 'bg-primary-500' : 'bg-neutral-200'}`}
                />
              ))}
            </div>
            <div className="bg-white px-4 py-2 rounded-full border border-neutral-200 font-bold text-sm text-neutral-500">
              {stats.correct} / {stats.attempted} correct
            </div>
          </div>
        </div>

        <Card className="card-hero animate-fade-in-up rounded-3xl p-8 md:p-10">
          <div key={slide.id} className="animate-slide-in-right">
            <div className="mb-6">
              <span className="text-neutral-400 font-bold text-sm tracking-wider uppercase">
                {slide.category || courseName}
              </span>
              {slide.title && (
                <h1 className="font-display text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight mt-1">
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
                variant="primary"
                disabled={!checker.isComplete(slide, value)}
              >
                Check
              </Button>
            ) : (
              <Button onClick={handleNext} variant="primary" disabled={!goalsSatisfied}>
                {stats.attempted >= SESSION_LENGTH ? 'See how you did' : 'Next'}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
