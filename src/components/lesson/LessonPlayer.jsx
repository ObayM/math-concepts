'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, RotateCcw, BrainCircuit } from 'lucide-react';

import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Card from '@/components/ui/Card';
import LessonCompletion from '@/components/lesson/LessonCompletion';
import { askTutor } from '@/utils/geminiService';

import TextBlock from './blocks/TextBlock';
import GraphBlock from './blocks/GraphBlock';
import QuizBlock from './blocks/QuizBlock';
import SceneBlock from './blocks/SceneBlock';

const blockRegistry = {
  text: TextBlock,
  graph: GraphBlock,
  quiz: QuizBlock,
  scene: SceneBlock,
};

export default function LessonPlayer({ slides = [], lessonId, coursePath = 'algebra' }) {
  const router = useRouter();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDir, setSlideDir] = useState('right');
  const [interactiveValue, setInteractiveValue] = useState(50);
  const [selectedOption, setSelectedOption] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizHistory, setQuizHistory] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [streak, setStreak] = useState(null);

  const [tutorOpen, setTutorOpen] = useState(false);
  const [tutorQuery, setTutorQuery] = useState('');
  const [tutorResponse, setTutorResponse] = useState('');
  const [tutorLoading, setTutorLoading] = useState(false);

  const slide = slides[currentIndex] ?? null;
  const isLast = currentIndex === slides.length - 1;

  useEffect(() => {
    if (!lessonId) return;
    fetch(`/api/progress?lessonKey=${lessonId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.currentStep > 0 && d.currentStep < slides.length) setCurrentIndex(d.currentStep);
        if (d.completed) {
          setIsComplete(true);
          if (Array.isArray(d.quizHistory)) setQuizHistory(d.quizHistory);
        }
        setProgressLoaded(true);
      })
      .catch(() => setProgressLoaded(true));
  }, [lessonId, slides.length]);

  useEffect(() => {
    if (!progressLoaded || !lessonId) return;
    fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonKey: lessonId, currentStep: currentIndex, isCompleted: false }),
    }).catch(console.error);
  }, [currentIndex, lessonId, progressLoaded]);

  useEffect(() => {
    fetch('/api/streak')
      .then((r) => r.json())
      .then((d) => {
        if (d.streak !== undefined) setStreak(d.streak);
      })
      .catch(console.error);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setInteractiveValue(50);
    setSelectedOption(null);
    setQuizSubmitted(false);
    setTutorOpen(false);
    setTutorResponse('');
  }, [currentIndex]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const markComplete = () => {
    fetch('/api/update-activity', { method: 'POST' })
      .then((r) => r.json())
      .then(() =>
        fetch('/api/streak')
          .then((r) => r.json())
          .then((d) => {
            if (d.streak !== undefined) setStreak(d.streak);
          })
      )
      .catch(console.error);

    fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonKey: lessonId,
        currentStep: currentIndex,
        isCompleted: true,
        quizHistory,
      }),
    }).catch(console.error);
  };

  const handleNext = () => {
    if (isLast) {
      markComplete();
      setIsComplete(true);
    } else {
      setSlideDir('right');
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setSlideDir('left');
      setCurrentIndex((i) => i - 1);
    }
  };

  const handleQuizSubmit = () => {
    setQuizSubmitted(true);
    const correct = selectedOption === slide.correctOption;
    setQuizHistory((h) => [...h, { title: slide.title, question: slide.content, correct }]);
  };

  const handleTutorAsk = async () => {
    if (!tutorQuery.trim()) return;
    setTutorLoading(true);
    const answer = await askTutor(slide.content, tutorQuery);
    setTutorResponse(answer);
    setTutorLoading(false);
  };

  const handleContinue = () => router.push(`/courses/${coursePath}`);
  const handleBackToCourse = () => router.push(`/courses/${coursePath}`);

  if (!slides.length) {
    return (
      <div className="min-h-[calc(100vh-var(--nav-h))] bg-surface flex items-center justify-center">
        <Card className="animate-fade-in-up w-full max-w-4xl min-h-[500px] flex flex-col items-center justify-center p-8 text-center">
          <h2 className="text-2xl font-bold text-neutral-800 animate-pulse">Loading lesson...</h2>
          <p className="text-neutral-500 mt-2">Hang tight while we get things ready.</p>
          <Button onClick={handleBackToCourse} variant="ghost" className="mt-6">
            Back to Course
          </Button>
        </Card>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-[calc(100vh-var(--nav-h))] bg-surface flex items-center justify-center">
        <Card className="animate-fade-in-up w-full max-w-4xl min-h-[500px] flex items-center justify-center">
          <LessonCompletion
            onContinue={handleContinue}
            onBack={handleBackToCourse}
            streak={streak}
            quizHistory={quizHistory}
          />
        </Card>
      </div>
    );
  }

  const isQuiz = slide?.type === 'quiz';
  const canAdvance = !isQuiz || quizSubmitted;
  const BlockRenderer = slide ? (blockRegistry[slide.type] ?? TextBlock) : null;

  return (
    <div className="min-h-[calc(100vh-var(--nav-h))] bg-surface text-neutral-900 p-4 md:p-6 flex items-center justify-center selection:bg-primary-100 selection:text-primary-900 relative overflow-hidden">
      {streak !== null && (
        <div className="absolute top-4 right-4 bg-white px-4 py-2 rounded-full border border-neutral-200 font-bold text-orange-500 flex items-center gap-2 z-10">
          🔥 {streak} Day Streak
        </div>
      )}

      <div className="animate-fade-in-up w-full max-w-4xl bg-white rounded-2xl overflow-hidden border border-neutral-200 flex flex-col relative">
        <div className="pt-8 px-10 pb-2 flex items-center justify-between">
          <div className="flex-1 mx-8 flex space-x-1 h-2">
            {slides.map((_, idx) => (
              <div
                key={idx}
                className={`flex-1 rounded-full transition-all duration-500 ${idx <= currentIndex ? 'bg-success-500' : 'bg-neutral-200'}`}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 px-10 py-6 overflow-hidden relative">
          <div
            key={currentIndex}
            className={`h-full flex flex-col ${slideDir === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}
          >
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-neutral-400 font-bold text-sm tracking-wider uppercase">
                  {slide?.category || 'Concept'}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-neutral-900 tracking-tight">
                {slide?.title}
              </h1>
            </div>

            <div className="flex-1 w-full">
              {BlockRenderer && (
                <BlockRenderer
                  slide={slide}
                  interactiveValue={interactiveValue}
                  onInteractiveChange={setInteractiveValue}
                  selectedOption={selectedOption}
                  submitted={quizSubmitted}
                  onSelect={setSelectedOption}
                />
              )}
            </div>
          </div>
        </div>

        <div className="px-10 py-6 border-t border-neutral-100 flex items-center justify-between gap-4">
          <Button onClick={handleBack} variant="ghost" disabled={currentIndex === 0}>
            Back
          </Button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setTutorOpen((o) => !o)}
              className="text-neutral-400 hover:text-primary-600 transition-colors p-2 rounded-xl hover:bg-primary-50"
              title="Ask AI Tutor"
            >
              <Sparkles className="w-5 h-5" />
            </button>

            {isQuiz && !quizSubmitted ? (
              <Button
                onClick={handleQuizSubmit}
                variant="success"
                disabled={selectedOption === null}
              >
                Check Answer
              </Button>
            ) : (
              <Button onClick={handleNext} variant="success" disabled={!canAdvance}>
                {isLast ? 'Complete!' : 'Continue'}
              </Button>
            )}
          </div>
        </div>

        <div
          className={`border-t border-neutral-100 bg-neutral-50/50 transition-all duration-300 ${tutorOpen ? 'h-auto' : 'h-0 overflow-hidden'}`}
        >
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="bg-accent-600 p-2 rounded-xl text-white">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-accent-500 uppercase mb-2">AI Math Tutor</p>

                {tutorResponse ? (
                  <div className="animate-fade-in-up bg-white p-4 rounded-2xl border border-accent-100 text-neutral-700 text-sm leading-relaxed">
                    {tutorResponse}
                    <div className="mt-3 pt-3 border-t border-neutral-100 flex justify-end">
                      <button
                        onClick={() => setTutorResponse('')}
                        className="text-xs font-bold text-accent-600 flex items-center hover:underline"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" /> Ask new question
                      </button>
                    </div>
                  </div>
                ) : tutorLoading ? (
                  <div className="flex items-center gap-3 text-neutral-500 text-sm">
                    <BrainCircuit className="w-5 h-5 text-accent-500 animate-pulse" />
                    Thinking...
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={tutorQuery}
                      onChange={(e) => setTutorQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleTutorAsk()}
                      placeholder="e.g. Why is symmetry important?"
                      className="flex-1 bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-accent-500 outline-none"
                    />
                    <Button onClick={handleTutorAsk} variant="accent" size="sm">
                      Ask
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
