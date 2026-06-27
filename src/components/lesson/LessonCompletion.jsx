'use client';

import React from 'react';
import { CheckCircle2, ArrowRight, Home, Star } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function LessonCompletion({
  onContinue,
  onBack,
  nextLessonId,
  streak,
  quizHistory = [],
}) {
  const quizCount = quizHistory.length;
  const correctCount = quizHistory.filter((q) => q.correct).length;
  const accuracy = quizCount > 0 ? Math.round((correctCount / quizCount) * 100) : null;

  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-6">
      <div className="animate-pop-in mb-8">
        <div className="w-32 h-32 bg-success-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-20 h-20 text-success-500" />
        </div>
      </div>

      <div className="animate-fade-in-up [animation-delay:300ms] opacity-0">
        <h2 className="text-4xl font-extrabold text-neutral-900 mb-4">Lesson Complete!</h2>
        <p className="text-xl text-neutral-500 mb-8">You&apos;re making great progress.</p>
      </div>

      <div className="animate-fade-in-up [animation-delay:500ms] opacity-0 grid grid-cols-2 gap-4 w-full max-w-sm mb-10">
        <div className="bg-warning-50 border-2 border-warning-100 p-4 rounded-2xl flex flex-col items-center">
          <span className="text-3xl font-bold text-warning-600 mb-1">{streak ?? 0}</span>
          <span className="text-xs font-bold text-warning-600 uppercase tracking-wider flex items-center gap-1">
            <span className="text-lg">🔥</span> Day Streak
          </span>
        </div>

        <div className="bg-primary-50 border-2 border-primary-100 p-4 rounded-2xl flex flex-col items-center">
          <span className="text-3xl font-bold text-primary-600 mb-1">
            {accuracy !== null ? `${accuracy}%` : '—'}
          </span>
          <span className="text-xs font-bold text-primary-500 uppercase tracking-wider flex items-center gap-1">
            <Star className="w-4 h-4 fill-current" /> Accuracy
          </span>
        </div>
      </div>

      <div className="animate-fade-in-up [animation-delay:600ms] opacity-0 flex flex-col gap-3 w-full max-w-xs">
        <Button
          variant="success"
          size="lg"
          fullWidth
          onClick={onContinue}
          className="rounded-2xl font-extrabold"
        >
          {nextLessonId ? 'Next Lesson' : 'Finish Course'} <ArrowRight className="w-5 h-5" />
        </Button>

        <Button variant="ghost" size="lg" fullWidth onClick={onBack}>
          <Home className="w-5 h-5" /> Back to Course
        </Button>
      </div>
    </div>
  );
}
