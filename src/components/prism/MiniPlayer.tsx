'use client';
import { useState, useEffect } from 'react';
import SlideView from '@/components/lesson/SlideView';
import { exercises } from '@/components/lesson/exercises';
import { evalGoals } from '@/engine/runtime/goals';
import type { Scope } from '@/engine/ir/types';
import type { LessonIR } from '@/engine/ir/lesson';

// a trimmed-down LessonPlayer for docs/cookbook/playground previews — slide
// nav if there's more than one slide, Check/Continue for the one exercise a
// slide can have, no progress bar/tutor/backend calls.
export default function MiniPlayer({ lesson }: { lesson: LessonIR }) {
  const [idx, setIdx] = useState(0);
  const slide = lesson.slides[Math.min(idx, lesson.slides.length - 1)];
  const checker = slide.exercise ? exercises[slide.exercise.kind] : null;

  const [value, setValue] = useState<unknown>(() => (checker ? checker.initial(slide) : null));
  const [checked, setChecked] = useState(false);
  const [goalsState, setGoalsState] = useState<{ slideId: string | null; met: boolean[] }>({
    slideId: null,
    met: [],
  });

  useEffect(() => {
    setValue(checker ? checker.initial(slide) : null);
    setChecked(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const correct = checked && checker ? checker.check(slide, value) : null;
  const goalsMet =
    goalsState.slideId === slide.id ? goalsState.met : (slide.goals ?? []).map(() => false);

  const handleScopeChange = (scope: Scope) => {
    if (!slide.goals?.length) return;
    setGoalsState((prev) => {
      const prevMet = prev.slideId === slide.id ? prev.met : [];
      return { slideId: slide.id, met: evalGoals(slide.goals!, prevMet, scope) };
    });
  };

  return (
    <div className="mini-player">
      {lesson.slides.length > 1 && (
        <div className="mini-player-tabs">
          {lesson.slides.map((s, i) => (
            <button
              key={s.id}
              className={`mini-player-tab ${i === idx ? 'active' : ''} ${s.hidden ? 'detour' : ''}`}
              onClick={() => setIdx(i)}
              title={s.hidden ? `${s.id} — detour, off the main path` : s.title}
            >
              {s.hidden ? '↳' : i + 1}
            </button>
          ))}
        </div>
      )}

      <SlideView
        slide={slide}
        value={value}
        checked={checked}
        correct={correct}
        onChange={(v: unknown) => {
          setValue(v);
          setChecked(false);
        }}
        goalsMet={goalsMet}
        onScopeChange={handleScopeChange}
      />

      {checker && (
        <div className="mini-player-actions">
          {!checked ? (
            <button
              className="mini-player-check"
              disabled={!checker.isComplete(slide, value)}
              onClick={() => setChecked(true)}
            >
              Check
            </button>
          ) : (
            <button className="mini-player-check" onClick={() => setChecked(false)}>
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
