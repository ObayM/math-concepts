'use client';
import { Scene } from '@/engine';
import RichText, { proseClass } from './RichText';
import GoalBanner from './GoalBanner';
import QuizExercise from './exercises/QuizExercise';
import NumericExercise from './exercises/NumericExercise';
import BuildExercise from './exercises/BuildExercise';
import HotspotExercise from './exercises/HotspotExercise';
import SketchExercise from './exercises/SketchExercise';
import MatchExercise from './exercises/MatchExercise';
import OrderExercise from './exercises/OrderExercise';
import SortExercise from './exercises/SortExercise';
import TableExercise from './exercises/TableExercise';
import { useT } from '@/components/i18n/LocaleProvider';

const exerciseRegistry = {
  quiz: QuizExercise,
  numeric: NumericExercise,
  build: BuildExercise,
  hotspot: HotspotExercise,
  sketch: SketchExercise,
  match: MatchExercise,
  order: OrderExercise,
  sort: SortExercise,
  table: TableExercise,
};

export default function SlideView({
  slide,
  value,
  checked,
  correct,
  onChange,
  goalsMet,
  onScopeChange,
  revealAnswer = true,
}) {
  const t = useT();
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
    <div className="flex flex-col gap-8 h-full">
      {slide.prose && <RichText className={proseClass}>{slide.prose}</RichText>}

      {slide.scene && (
        // a diagram is left-to-right in every language: x grows rightwards and
        // the axes are not mirrored, so the scene opts out of the page direction
        <div dir="ltr">
          <Scene
            ir={slide.scene}
            onScopeChange={onScopeChange}
            onTap={onTap}
            marker={marker}
            revealed={checked && revealAnswer}
            inputLayer={inputLayer}
            tapLabel={t('exercise.sceneAria')}
          />
        </div>
      )}

      {slide.goals && <GoalBanner key={slide.id} goals={slide.goals} goalsMet={goalsMet} />}

      {Exercise && (
        <div data-feedback={checked ? (correct ? 'correct' : 'wrong') : undefined}>
          <Exercise
            slide={slide}
            value={value}
            checked={checked}
            correct={correct}
            onChange={onChange}
            revealAnswer={revealAnswer}
          />
        </div>
      )}
    </div>
  );
}
