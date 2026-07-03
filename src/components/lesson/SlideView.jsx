'use client';
import { Scene } from '@/engine';
import RichText from './RichText';
import QuizExercise from './exercises/QuizExercise';
import NumericExercise from './exercises/NumericExercise';
import BuildExercise from './exercises/BuildExercise';

// renders a v2 slide as a composition: prose + scene + exercise.
// a slide is no longer one "type" — it stacks whatever parts it declares.
const exerciseRegistry = {
  quiz: QuizExercise,
  numeric: NumericExercise,
  build: BuildExercise,
};

export default function SlideView({ slide, value, checked, correct, onChange }) {
  const Exercise = slide.exercise ? exerciseRegistry[slide.exercise.kind] : null;

  return (
    <div className="flex flex-col gap-6 h-full">
      {slide.prose && (
        <RichText className="text-xl text-neutral-600 leading-relaxed font-medium block">
          {slide.prose}
        </RichText>
      )}

      {slide.scene && <Scene ir={slide.scene} />}

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
