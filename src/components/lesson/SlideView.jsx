'use client';
import { Scene } from '@/engine';
import RichText from './RichText';
import GoalBanner from './GoalBanner';
import QuizExercise from './exercises/QuizExercise';
import NumericExercise from './exercises/NumericExercise';
import BuildExercise from './exercises/BuildExercise';
import HotspotExercise from './exercises/HotspotExercise';
import SketchExercise from './exercises/SketchExercise';
import MatchExercise from './exercises/MatchExercise';

// renders a v2 slide as a composition: prose + scene + exercise.
// a slide is no longer one "type" — it stacks whatever parts it declares.
const exerciseRegistry = {
  quiz: QuizExercise,
  numeric: NumericExercise,
  build: BuildExercise,
  hotspot: HotspotExercise,
  sketch: SketchExercise,
  match: MatchExercise,
};

export default function SlideView({
  slide,
  value,
  checked,
  correct,
  onChange,
  goalsMet,
  onScopeChange,
}) {
  const Exercise = slide.exercise ? exerciseRegistry[slide.exercise.kind] : null;

  const isHotspot = slide.exercise?.kind === 'hotspot';
  const onTap = isHotspot && !checked ? (x, y) => onChange([x, y]) : undefined;
  const marker =
    isHotspot && Array.isArray(value)
      ? { x: value[0], y: value[1], correct: checked ? correct : undefined }
      : undefined;

  const isSketch = slide.exercise?.kind === 'sketch';
  const inputLayer = isSketch
    ? {
        mode: slide.exercise.mode,
        value,
        onChange,
        disabled: checked,
        maxPoints: slide.exercise.mode === 'points' ? slide.exercise.targets.length : undefined,
      }
    : undefined;

  return (
    <div className="flex flex-col gap-6 h-full">
      {slide.prose && (
        <RichText className="text-xl text-neutral-600 leading-relaxed font-medium block">
          {slide.prose}
        </RichText>
      )}

      {slide.scene && (
        <Scene
          ir={slide.scene}
          onScopeChange={onScopeChange}
          onTap={onTap}
          marker={marker}
          revealed={checked}
          inputLayer={inputLayer}
        />
      )}

      {slide.goals && <GoalBanner goals={slide.goals} goalsMet={goalsMet} />}

      {Exercise && (
        <Exercise
          slide={slide}
          value={value}
          checked={checked}
          correct={correct}
          onChange={onChange}
        />
      )}
    </div>
  );
}
