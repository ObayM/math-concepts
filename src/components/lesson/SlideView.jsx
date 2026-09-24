'use client';
import { useState } from 'react';
import { Scene } from '@/engine';
import { exerciseVisible } from '@/engine/runtime/flow';
import { emptyMemory, keptInitial, withMemory } from '@/engine/runtime/memory';
import RichText, { proseClass } from './RichText';
import GoalBanner from './GoalBanner';
import HintLadder from './HintLadder';
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

const NO_MEMORY = emptyMemory();

export default function SlideView({
  slide: source,
  value,
  checked,
  correct,
  onChange,
  goalsMet,
  onScopeChange,
  revealAnswer = true,
  onStepChange = () => {},
  memory = NO_MEMORY,
}) {
  const t = useT();
  const slide = withMemory(source, memory);
  const [command, setCommand] = useState(null);
  const [step, setStep] = useState({ slideId: slide.id, idx: 0 });
  const stepIdx = step.slideId === slide.id ? step.idx : 0;
  const handleStep = (idx) => {
    setStep({ slideId: slide.id, idx });
    onStepChange(idx);
  };
  const shown = exerciseVisible(slide, goalsMet, stepIdx);
  const showMe = (i) => {
    const goal = slide.goals?.[i];
    if (goal?.showme) setCommand({ id: Date.now(), slideId: slide.id, ...goal.showme });
  };
  const Exercise = slide.exercise && shown ? exerciseRegistry[slide.exercise.kind] : null;

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
            command={command?.slideId === slide.id ? command : undefined}
            onStepChange={handleStep}
            initial={keptInitial(slide, memory)}
          />
        </div>
      )}

      {slide.goals && (
        <GoalBanner key={slide.id} goals={slide.goals} goalsMet={goalsMet} onShowMe={showMe} />
      )}

      {Exercise && (
        <div
          className={slide.exercise?.after !== undefined ? 'animate-fade-in-up' : undefined}
          data-feedback={checked ? (correct ? 'correct' : 'wrong') : undefined}
        >
          <Exercise
            slide={slide}
            value={value}
            checked={checked}
            correct={correct}
            onChange={onChange}
            revealAnswer={revealAnswer}
          />
          <div className="mt-4">
            <HintLadder key={slide.id} hints={slide.exercise.hints} disabled={checked} />
          </div>
        </div>
      )}
    </div>
  );
}
