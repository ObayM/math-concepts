'use client';

import React from 'react';
import { CheckCircle2, ArrowRight, Home, Star } from 'lucide-react';
import Button from './Button';

export default function LessonComplete({ onContinue, onBack, nextLessonId, streak }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-6">
      <div className="animate-pop-in mb-8 relative">
        <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-20 h-20 text-green-500" />
        </div>
      </div>

      <div className="animate-fade-in-up [animation-delay:300ms] opacity-0">
        <h2 className="text-4xl font-extrabold text-slate-800 mb-4">Lesson Complete!</h2>
        <p className="text-xl text-slate-600 mb-8">You&apos;re making great progress.</p>
      </div>

      <div className="animate-fade-in-up [animation-delay:500ms] opacity-0 grid grid-cols-2 gap-4 w-full max-w-sm mb-10">
        <div className="bg-orange-50 border-2 border-orange-100 p-4 rounded-2xl flex flex-col items-center">
          <span className="text-3xl font-bold text-orange-500 mb-1">{streak}</span>
          <span className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1">
            <span className="text-lg">🔥</span> Day Streak
          </span>
        </div>

        <div className="bg-blue-50 border-2 border-blue-100 p-4 rounded-2xl flex flex-col items-center">
          <span className="text-3xl font-bold text-blue-500 mb-1">100%</span>
          <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
            <Star className="w-4 h-4 fill-current" /> Accuracy
          </span>
        </div>
      </div>

      <div className="animate-fade-in-up [animation-delay:600ms] opacity-0 flex flex-col gap-3 w-full max-w-xs">
        <Button
          onClick={onContinue}
          className="w-full bg-[#58CC02] hover:bg-[#46a302] border-b-[3px] border-[#46a302] active:border-b-0 active:translate-y-[3px] text-white font-extrabold text-lg py-4 rounded-2xl flex items-center justify-center gap-2"
        >
          {nextLessonId ? 'Next Lesson' : 'Finish Course'} <ArrowRight className="w-5 h-5" />
        </Button>

        <button
          onClick={onBack}
          className="w-full py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors flex items-center justify-center gap-2"
        >
          <Home className="w-5 h-5" /> Back to Course
        </button>
      </div>
    </div>
  );
}
