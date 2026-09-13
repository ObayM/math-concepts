'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import SlideView from '@/components/lesson/SlideView';
import { exercises } from '@/components/lesson/exercises';
import { evalGoals } from '@/engine/runtime/goals';
import { weightedPick, slideSkill } from '@/lib/practice';
import { useT } from '@/components/i18n/LocaleProvider';

const SESSION_LENGTH = 10;

const playable = (slide) => (slide && exercises[slide.exercise?.kind] ? slide : null);

export default function PracticeRunner({ pool, mastery = {}, coursePath, courseName }) {
  const t = useT();
  const router = useRouter();

  const [slide, setSlide] = useState(null);
  const [value, setValue] = useState(null);
  const [checked, setChecked] = useState(false);
  const [goalsState, setGoalsState] = useState({ slideId: null, met: [] });
  const [stats, setStats] = useState({ attempted: 0, correct: 0 });
  const [done, setDone] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const liveMastery = useRef({ ...mastery });
  const activityTouched = useRef(false);

  useEffect(() => {
    const first = playable(weightedPick(pool, liveMastery.current));
    if (!first) {
      setEmpty(true);
      return;
    }
    setSlide(first);
    setValue(exercises[first.exercise.kind].initial(first));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (empty) {
    return (
      <div className="-mt-[var(--nav-h)] min-h-dvh pt-[var(--nav-h)] flex items-center justify-center">
        <Card className="card-soft p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-neutral-900">
            {t('practice.nothing')}
          </h1>
          <p className="mt-2 text-neutral-500">
            {courseName} has no questions ready yet. Try a lesson first.
          </p>
          <Link href={`/courses/${coursePath}`} className="mt-6 inline-block">
            <Button variant="secondary">{t('practice.backTo', { course: courseName })}</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (!slide) {
    return (
      <div className="-mt-[var(--nav-h)] min-h-dvh pt-[var(--nav-h)] flex items-center justify-center">
        <Card className="card-soft p-8">
          <p className="text-neutral-500 animate-pulse">{t('practice.loading')}</p>
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
          if (typeof d?.xp === 'number') setXpEarned((x) => x + d.xp);
          if (typeof d?.correct === 'boolean' && d.correct !== isCorrect) {
            setStats((s) => ({ ...s, correct: s.correct + (d.correct ? 1 : -1) }));
          }
        })
        .catch(() => {});
    }
  };

  const handleNext = () => {
    const next =
      stats.attempted >= SESSION_LENGTH
        ? null
        : playable(weightedPick(pool, liveMastery.current, Math.random, slide));
    if (!next) {
      setDone(true);
      return;
    }
    setSlide(next);
    setValue(exercises[next.exercise.kind].initial(next));
    setChecked(false);
  };

  const handleAgain = () => {
    setStats({ attempted: 0, correct: 0 });
    setXpEarned(0);
    setDone(false);
    setChecked(false);
    const next = playable(weightedPick(pool, liveMastery.current, Math.random, slide));
    if (!next) {
      setDone(true);
      return;
    }
    setSlide(next);
    setValue(exercises[next.exercise.kind].initial(next));
  };

  if (done) {
    const pct = stats.attempted ? Math.round((stats.correct / stats.attempted) * 100) : 0;
    return (
      <div className="-mt-[var(--nav-h)] min-h-dvh px-4 pb-4 pt-[var(--nav-h)] md:px-6 md:pb-6 flex items-center justify-center">
        <Card className="card-hero animate-fade-in-up rounded-3xl p-10 max-md:p-6 w-full max-w-lg text-center">
          <p className="text-primary-500 font-bold text-sm tracking-wider uppercase mb-3">
            Session done
          </p>
          <h1 className="font-display text-4xl font-bold text-neutral-900 tracking-tight mb-2">
            {t('practice.outOf', { correct: stats.correct, total: stats.attempted })}
          </h1>
          <p className="text-neutral-500 mb-6">
            {pct >= 80
              ? t('practice.sharp')
              : pct >= 50
                ? t('practice.middling')
                : t('practice.rough')}
          </p>
          {xpEarned > 0 && (
            <p className="mb-8 inline-flex items-center gap-1.5 rounded-full bg-warning-100 px-4 py-1.5 text-sm font-bold text-warning-600">
              +{xpEarned} XP
            </p>
          )}
          <div className="flex flex-col gap-3">
            <Button onClick={handleAgain} variant="primary">
              Go again
            </Button>
            <Button onClick={() => router.push(`/courses/${coursePath}`)} variant="ghost">
              {t('practice.backTo', { course: courseName })}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="-mt-[var(--nav-h)] min-h-dvh px-4 pb-4 pt-[var(--nav-h)] md:px-6 md:pb-6 flex items-center justify-center">
      <div className="w-full max-w-5xl">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push(`/courses/${coursePath}`)}
            aria-label={t('practice.backTo', { course: courseName })}
            className="tap-target flex items-center gap-1.5 text-neutral-500 hover:text-neutral-700 font-bold text-sm transition-colors max-sm:justify-start"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="max-sm:hidden">{t('practice.backTo', { course: courseName })}</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 max-sm:hidden">
              {Array.from({ length: SESSION_LENGTH }, (_, i) => (
                <div
                  key={i}
                  className={`h-2 w-4 rounded-full transition-colors ${i < stats.attempted ? 'bg-primary-500' : 'bg-neutral-200'}`}
                />
              ))}
            </div>
            <div className="bg-white px-4 py-2 rounded-full border border-neutral-200 font-bold text-sm text-neutral-500">
              {t('practice.scoreLine', { correct: stats.correct, total: stats.attempted })}
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
                <h1 className="font-display text-3xl md:text-4xl font-bold leading-tight text-neutral-900 tracking-tight mt-1">
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
                {t('lesson.check')}
              </Button>
            ) : (
              <Button onClick={handleNext} variant="primary" disabled={!goalsSatisfied}>
                {stats.attempted >= SESSION_LENGTH ? t('practice.seeHow') : t('practice.next')}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
