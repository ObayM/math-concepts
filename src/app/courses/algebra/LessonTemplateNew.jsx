'use client';
import React, { useState, useEffect } from 'react';

import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { FunctionVisualizer } from '@/components/visualizations';
import { CheckCircle2, XCircle, Sparkles, HelpCircle, BrainCircuit, RotateCcw } from 'lucide-react';
import { askTutor, generatePersonalizedSlide } from '@/utils/geminiService';
import LessonCompletion from '@/components/slides/LessonCompletion';
import { lessonsData, geometryLessonsData } from '@/components/lib/data';
import { useRouter } from 'next/navigation';

const LoadingState = Object.freeze({
  IDLE: 'IDLE',
  LOADING: 'LOADING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
});

export default function AdvancedLessonView({ lessonData: initialSlides = [], lessonId }) {
  const router = useRouter();

  const [slides, setSlides] = useState(initialSlides || []);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slideDir, setSlideDir] = useState('right');
  const [interactiveValue, setInteractiveValue] = useState(50);
  const [selectedQuizOption, setSelectedQuizOption] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizHistory, setQuizHistory] = useState([]);

  const [isGeneratingNext, setIsGeneratingNext] = useState(false);

  const [isLessonComplete, setIsLessonComplete] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);

  const [tutorOpen, setTutorOpen] = useState(false);
  const [tutorQuery, setTutorQuery] = useState('');
  const [tutorResponse, setTutorResponse] = useState('');
  const [tutorLoading, setTutorLoading] = useState(LoadingState.IDLE);
  const [streak, setStreak] = useState(null);

  const currentSlide = slides && slides.length > 0 ? slides[currentSlideIndex] : null;
  const isLastSlide = slides && slides.length > 0 ? currentSlideIndex === slides.length - 1 : false;

  useEffect(() => {
    if (!lessonId) return;

    fetch(`/api/progress?lessonKey=${lessonId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.currentStep > 0 && data.currentStep < slides.length) {
          setCurrentSlideIndex(data.currentStep);
        }
        if (data.completed) {
          setIsLessonComplete(true);
        }
        setProgressLoaded(true);
      })
      .catch((err) => {
        console.error('failed to fetch progress :(', err);
      });
  }, [lessonId, slides.length]);

  useEffect(() => {
    if (!progressLoaded || !lessonId) return;

    const saveProgress = async () => {
      try {
        await fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lessonKey: lessonId,
            currentStep: currentSlideIndex,
            isCompleted: false,
          }),
        });
      } catch (err) {
        console.error('Failed to save progress:', err);
      }
    };
    saveProgress();
  }, [currentSlideIndex, lessonId, progressLoaded]);

  useEffect(() => {
    fetch('/api/streak')
      .then((res) => res.json())
      .then((data) => {
        if (data.streak !== undefined) setStreak(data.streak);
      })
      .catch((err) => console.error('Failed because of -->', err));
  }, []);

  useEffect(() => {
    if (isLastSlide && currentSlide && !currentSlide.isAiGenerated && !isGeneratingNext) {
    }
  }, [isLastSlide, currentSlide, isGeneratingNext]);

  const handleCompletion = () => {
    fetch('/api/update-activity', { method: 'POST' })
      .then((res) => res.json())
      .then(() => {
        fetch('/api/streak')
          .then((res) => res.json())
          .then((data) => {
            if (data.streak !== undefined) setStreak(data.streak);
          });
      })
      .catch((err) => console.error('Failed to update activity:', err));

    fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonKey: lessonId,
        currentStep: currentSlideIndex,
        isCompleted: true,
      }),
    }).catch((err) => console.error('Failed to mark completion:', err));
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setInteractiveValue(50);
    setSelectedQuizOption(null);
    setQuizSubmitted(false);
    setTutorOpen(false);
    setTutorResponse('');
  }, [currentSlideIndex]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleQuizSubmit = () => {
    setQuizSubmitted(true);

    const isCorrect = selectedQuizOption === currentSlide.correctOption;
    const record = `Slide: ${currentSlide.title}, Question: ${currentSlide.content}, Result: ${isCorrect ? 'Correct' : 'Incorrect'}`;
    setQuizHistory((prev) => [...prev, record]);
  };

  const handleNext = async () => {
    if (isLastSlide) {
      if (!currentSlide.isAiGenerated) {
        handleCompletion();
        setIsLessonComplete(true);
        return;
      }
    } else {
      setSlideDir('right');
      setCurrentSlideIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentSlideIndex > 0) {
      setSlideDir('left');
      setCurrentSlideIndex((prev) => prev - 1);
    }
  };

  const handleTutorAsk = async () => {
    if (!tutorQuery.trim()) return;
    setTutorLoading(LoadingState.LOADING);
    const answer = await askTutor(currentSlide.content, tutorQuery);
    setTutorResponse(answer);
    setTutorLoading(LoadingState.SUCCESS);
  };

  const handleContinue = () => {
    const allLessons = [...lessonsData, ...geometryLessonsData];
    const currentLessonIndex = allLessons.findIndex((l) => l.id === lessonId);
    const nextLesson = allLessons[currentLessonIndex + 1];

    if (nextLesson) {
      const coursePath = nextLesson.category.toLowerCase();
      router.push(`/courses/${coursePath}/${nextLesson.id}`);
    } else {
      router.push('/courses/algebra');
    }
  };

  const handleBackToCourse = () => {
    router.push('/courses/algebra');
  };

  if (!slides || slides.length === 0) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-[#F5F5F7] flex items-center justify-center">
        <div className="animate-fade-in-up w-full max-w-4xl bg-white rounded-3xl overflow-hidden border border-gray-200 min-h-[500px] flex flex-col items-center justify-center p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-800 animate-pulse">
            Loading lesson slides...
          </h2>
          <p className="text-slate-500 mt-2">Please wait while we prepare the content.</p>
          <button
            onClick={handleBackToCourse}
            className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl transition-all duration-200 font-bold active:scale-95"
          >
            Back to Course
          </button>
        </div>
      </div>
    );
  }

  if (isLessonComplete) {
    const allLessons = [...lessonsData, ...geometryLessonsData];
    const currentLessonIndex = allLessons.findIndex((l) => l.id === lessonId);
    const nextLesson = allLessons[currentLessonIndex + 1];

    return (
      <div className="min-h-[calc(100vh-73px)] bg-[#F5F5F7] flex items-center justify-center">
        <div className="animate-fade-in-up w-full max-w-4xl bg-white rounded-3xl overflow-hidden border border-gray-200 min-h-[500px] flex items-center justify-center">
          <LessonCompletion
            onContinue={handleContinue}
            onBack={handleBackToCourse}
            nextLessonId={nextLesson ? nextLesson.id : null}
            streak={streak}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-[calc(100vh-73px)] bg-[#F5F5F7]
     text-slate-900 p-4 md:p-6 flex items-center justify-center
      selection:bg-blue-100 selection:text-blue-900 relative overflow-hidden"
    >
      {streak !== null && (
        <div className="absolute top-4 right-4 bg-white px-4 py-2 rounded-full border border-gray-200 font-bold text-orange-500 flex items-center gap-2 z-10">
          🔥 {streak} Day Streak
        </div>
      )}

      <div className="animate-fade-in-up w-full max-w-4xl bg-white rounded-2xl overflow-hidden border border-gray-200 flex flex-col relative">
        <div className="pt-8 px-10 pb-2 flex items-center justify-between">
          <div className="flex-1 mx-8 flex space-x-1 h-2">
            {slides.map((_, idx) => (
              <div
                key={idx}
                className={`flex-1 rounded-full transition-all duration-500 ${idx <= currentSlideIndex ? 'bg-[#58CC02]' : 'bg-slate-200'}`}
              />
            ))}

            {!slides.find((s) => s.isAiGenerated) && (
              <div className="flex-1 rounded-full bg-slate-100 border border-dashed border-slate-300 opacity-50" />
            )}
          </div>
        </div>

        <div className="flex-1 px-10 py-6 overflow-hidden relative">
          {isGeneratingNext ? (
            <div className="animate-fade-in-up h-full flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <Spinner size="lg" />
                <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500 w-10 h-10" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Analyzing your skills...</h2>
                <p className="text-slate-500 mt-2">Designing a personalized challenge for you.</p>
              </div>
            </div>
          ) : (
            <div
              key={currentSlideIndex}
              className={`h-full flex flex-col ${slideDir === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}
            >
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-2">
                  {currentSlide.isAiGenerated && (
                    <span className="bg-purple-100 text-purple-600 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wide flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AI Generated
                    </span>
                  )}
                  <span className="text-slate-400 font-bold text-sm tracking-wider uppercase">
                    {currentSlide.category || 'Concept'}
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
                  {currentSlide.title}
                </h1>
              </div>

              <p className="text-xl text-slate-600 leading-relaxed mb-8 font-medium">
                {currentSlide.content}
              </p>

              <div className="flex-1 w-full">
                {currentSlide.interactiveType === 'intro' && <></>}

                {currentSlide.interactiveType === 'graph' && currentSlide.visualization && (
                  <div className="flex flex-col space-y-6">
                    <FunctionVisualizer
                      config={currentSlide.visualization}
                      interactiveValue={interactiveValue}
                    />

                    <div className="bg-slate-100 rounded-3xl p-6">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Interact
                        </span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          {currentSlide.visualization.paramLabel || 'Value'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={interactiveValue}
                        onChange={(e) => setInteractiveValue(Number(e.target.value))}
                        className="w-full h-12 opacity-0 absolute z-20 cursor-pointer"
                      />
                      <div className="relative w-full h-4 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-75 ease-out"
                          style={{ width: `${interactiveValue}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-2">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="w-1 h-3 bg-slate-300 rounded-full" />
                        ))}
                      </div>
                      <p className="text-center text-slate-500 text-sm font-medium mt-3">
                        Drag to explore
                      </p>
                    </div>
                  </div>
                )}

                {currentSlide.interactiveType === 'quiz' && currentSlide.quizOptions && (
                  <div className="grid gap-3">
                    {currentSlide.quizOptions.map((option, idx) => {
                      const isSelected = selectedQuizOption === idx;
                      const isCorrect = idx === currentSlide.correctOption;

                      let containerClass =
                        'border-2 border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50';
                      if (isSelected) containerClass = 'border-blue-500 bg-blue-50';

                      if (quizSubmitted) {
                        if (isCorrect) containerClass = 'border-[#58CC02] bg-green-50';
                        else if (isSelected) containerClass = 'border-red-500 bg-red-50';
                        else containerClass = 'border-slate-100 bg-slate-50 opacity-50';
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => !quizSubmitted && setSelectedQuizOption(idx)}
                          className={`p-5 rounded-2xl text-left text-lg font-bold transition-all flex items-center justify-between active:scale-95 ${containerClass}`}
                        >
                          <span
                            className={
                              quizSubmitted && isCorrect
                                ? 'text-green-700'
                                : quizSubmitted && isSelected
                                  ? 'text-red-700'
                                  : 'text-slate-700'
                            }
                          >
                            {option}
                          </span>
                          {quizSubmitted && isCorrect && (
                            <CheckCircle2 className="text-[#58CC02] w-6 h-6" />
                          )}
                          {quizSubmitted && isSelected && !isCorrect && (
                            <XCircle className="text-red-500 w-6 h-6" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div
          className={`border-t border-slate-100 bg-slate-50/50 transition-all duration-300 ${tutorOpen ? 'h-auto' : 'h-0 overflow-hidden'}`}
        >
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="bg-indigo-600 p-2 rounded-xl text-white">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-indigo-500 uppercase mb-2">AI Math Tutor</p>

                {tutorResponse ? (
                  <div className="animate-fade-in-up bg-white p-4 rounded-2xl border border-indigo-100 text-slate-700 text-sm leading-relaxed">
                    {tutorResponse}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => setTutorResponse('')}
                        className="text-xs font-bold text-indigo-600 flex items-center hover:underline"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" /> Ask new question
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={tutorQuery}
                      onChange={(e) => setTutorQuery(e.target.value)}
                      placeholder="Eg. Why is symmetry important?"
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2
                                     focus:ring-indigo-500 outline-none"
                      onKeyDown={(e) => e.key === 'Enter' && handleTutorAsk()}
                    />
                    <Button
                      onClick={handleTutorAsk}
                      isLoading={tutorLoading === LoadingState.LOADING}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl! px-6!"
                    >
                      Ask
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 md:px-10 md:py-8 bg-white border-t border-slate-100 flex items-center justify-between gap-4">
          <button
            onClick={() => setTutorOpen(!tutorOpen)}
            className={`p-4 rounded-2xl transition-all duration-200 ${
              tutorOpen
                ? 'bg-indigo-100 text-indigo-600'
                : 'bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-500'
            }`}
          >
            <HelpCircle className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {currentSlideIndex > 0 && (
              <Button variant="neutral" onClick={handleBack} className="hidden md:flex">
                Back
              </Button>
            )}

            {currentSlide.interactiveType === 'quiz' && !quizSubmitted ? (
              <Button
                variant="success"
                onClick={handleQuizSubmit}
                disabled={selectedQuizOption === null}
                className="w-full md:w-auto font-extrabold tracking-wide uppercase"
              >
                Check
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                variant={
                  isLastSlide && !currentSlide.isAiGenerated && !isGeneratingNext
                    ? 'accent'
                    : 'success'
                }
                className="w-full md:w-auto font-extrabold tracking-wide uppercase"
              >
                {isLastSlide && !currentSlide.isAiGenerated ? (
                  <span className="flex items-center">
                    Generative Challenge <Sparkles className="ml-2 w-4 h-4" />
                  </span>
                ) : (
                  'Continue'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
