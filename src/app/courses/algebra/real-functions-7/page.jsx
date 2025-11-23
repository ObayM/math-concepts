'use client';
import React, { useState, useEffect } from 'react';

import Button from '@/components/slides/Button';
import { FunctionVisualizer } from '@/components/visualizations';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Sparkles, HelpCircle, BrainCircuit, RotateCcw } from 'lucide-react';
import { askTutor, generatePersonalizedSlide } from '@/utils/geminiService';

const LoadingState = Object.freeze({
  IDLE: 'IDLE',
  LOADING: 'LOADING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR'
});

const INITIAL_LESSON_DATA = [
  {
    id: 'intro-inverse',
    title: 'The Mirror World',
    content: "An inverse function undoes the action of the original function. If f(x) maps input A to output B, the inverse f⁻¹(x) maps B back to A. Graphically, this creates a beautiful symmetry across the line y = x.",
    interactiveType: 'intro',
    category: 'Introduction'
  },
  {
    id: 'horiz-line-test',
    title: 'The Horizontal Line Test',
    content: "To have an inverse, a function must be 'One-to-One', meaning no two inputs produce the same output. We test this with a horizontal line. If it hits the graph twice, there is no inverse function!",
    interactiveType: 'graph',
    category: 'Concept',
    visualization: {
      xDomain: [-4, 4],
      yDomain: [-5, 5],
      paramRange: [-4, 4],
      paramLabel: "Line Height k",
      elements: [
        { id: 'curve', type: 'function', expression: '0.25*x^2 - 2', color: '#3b82f6', strokeWidth: 4 },
        { id: 'hline', type: 'h-line', y: 't', color: '#ef4444', style: 'dashed', label: 'y = k' },

        { id: 'int1', type: 'point', x: '2 * sqrt(t + 2)', y: 't', color: '#ef4444', r: 5 },
        { id: 'int2', type: 'point', x: '-2 * sqrt(t + 2)', y: 't', color: '#ef4444', r: 5 }
      ]
    }
  },
  {
    id: 'reflection-symmetry',
    title: 'Reflection Symmetry',
    content: "The graph of an inverse function is the reflection of the original function across the diagonal line y = x. Notice how the blue curve (f) and purple curve (f⁻¹) mirror each other.",
    interactiveType: 'graph',
    category: 'Visualization',
    visualization: {
      xDomain: [-2, 6],
      yDomain: [-2, 6],
      paramRange: [0, 2.5],
      paramLabel: "Input x",
      elements: [
        { id: 'axis', type: 'function', expression: 'x', color: '#cbd5e1', strokeWidth: 2, style: 'dashed' },
        { id: 'func', type: 'function', expression: 'x^3 / 4 + 1', color: '#3b82f6', strokeWidth: 4 },
        { id: 'inv', type: 'function', expression: 'cbrt(4 * (x - 1))', color: '#a855f7', strokeWidth: 4 },

        { id: 'p_f', type: 'point', x: 't', y: 't^3/4 + 1', color: '#3b82f6', r: 6, label: 'f(x)' },
        { id: 'p_inv', type: 'point', x: 't^3/4 + 1', y: 't', color: '#a855f7', r: 6, label: 'f⁻¹(x)' },
        { id: 'conn', type: 'line', x1: 't', y1: 't^3/4 + 1', x2: 't^3/4 + 1', y2: 't', color: '#94a3b8', style: 'dotted' }
      ]
    }
  },
  {
    id: 'coord-swap',
    title: 'Swapping Coordinates',
    content: "Algebraically, finding the inverse involves swapping x and y. If the point (2, 5) is on f(x), then (5, 2) must be on f⁻¹(x). Watch the coordinates swap as you move the slider.",
    interactiveType: 'graph',
    category: 'Algebra',
    visualization: {
      xDomain: [-5, 5],
      yDomain: [-5, 5],
      paramRange: [-3, 3],
      paramLabel: "Value a",
      elements: [
        { id: 'diag', type: 'function', expression: 'x', color: '#cbd5e1', style: 'dashed' },
        { id: 'f', type: 'function', expression: '2*x - 1', color: '#3b82f6', strokeWidth: 3 },
        { id: 'finv', type: 'function', expression: '(x + 1) / 2', color: '#a855f7', strokeWidth: 3 },
        
        { id: 'pt_a', type: 'point', x: 't', y: '2*t - 1', color: '#3b82f6', r: 6, label: '(a, b)' },
        { id: 'pt_b', type: 'point', x: '2*t - 1', y: 't', color: '#a855f7', r: 6, label: '(b, a)' },
        
        { id: 'link', type: 'line', x1: 't', y1: '2*t - 1', x2: '2*t - 1', y2: 't', color: '#64748b', style: 'dashed' }
      ]
    }
  },
  {
    id: 'domain-restrict',
    title: 'Restricting the Domain',
    content: "Sometimes we cut a function in half to make it invertible. The parabola y=x² isn't one-to-one, but if we only keep x ≥ 0 (solid line), we can find its inverse: y=√x.",
    interactiveType: 'graph',
    category: 'Advanced',
    visualization: {
      xDomain: [-4, 6],
      yDomain: [-4, 6],
      paramRange: [0, 2.5], 
      paramLabel: "Input x",
      elements: [
        { id: 'diag', type: 'function', expression: 'x', color: '#cbd5e1', style: 'dashed' },

        { id: 'para_ghost', type: 'function', expression: 'x^2', color: '#bfdbfe', strokeWidth: 2, style: 'dashed' },

        { id: 'para_real', type: 'function', expression: '(x >= 0) ? x^2 : NaN', color: '#3b82f6', strokeWidth: 4 },

        { id: 'root', type: 'function', expression: '(x >= 0) ? sqrt(x) : NaN', color: '#a855f7', strokeWidth: 4 },
        
        { id: 'pt1', type: 'point', x: 't', y: 't^2', color: '#3b82f6', r: 5 },
        { id: 'pt2', type: 'point', x: 't^2', y: 't', color: '#a855f7', r: 5 },
        { id: 'conn', type: 'line', x1: 't', y1: 't^2', x2: 't^2', y2: 't', color: '#94a3b8', style: 'dotted' }
      ]
    }
  },
  {
    id: 'quiz-inverse',
    title: 'Check Your Understanding',
    content: "If a function f(x) has an inverse, which of the following MUST be true?",
    interactiveType: 'quiz',
    quizOptions: [
      'f(x) passes the Vertical Line Test', 
      'f(x) passes the Horizontal Line Test', 
      'f(x) is always increasing', 
      'f(x) is a straight line'
    ],
    correctOption: 1,
    category: 'Assessment'
  }
];

export default function Lesson() {

  const [slides, setSlides] = useState(INITIAL_LESSON_DATA);

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [interactiveValue, setInteractiveValue] = useState(50);
  const [selectedQuizOption, setSelectedQuizOption] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizHistory, setQuizHistory] = useState([]);
  

  const [isGeneratingNext, setIsGeneratingNext] = useState(false);

  const [tutorOpen, setTutorOpen] = useState(false);
  const [tutorQuery, setTutorQuery] = useState('');
  const [tutorResponse, setTutorResponse] = useState('');
  const [tutorLoading, setTutorLoading] = useState(LoadingState.IDLE);

  const currentSlide = slides[currentSlideIndex];
  const isLastSlide = currentSlideIndex === slides.length - 1;


  useEffect(() => {
    setInteractiveValue(50); 
    setSelectedQuizOption(null);
    setQuizSubmitted(false);
    setTutorOpen(false);
    setTutorResponse('');
  }, [currentSlideIndex]);

  const handleQuizSubmit = () => {
    setQuizSubmitted(true);
    

    const isCorrect = selectedQuizOption === currentSlide.correctOption;
    const record = `Slide: ${currentSlide.title}, Question: ${currentSlide.content}, Result: ${isCorrect ? 'Correct' : 'Incorrect'}`;
    setQuizHistory(prev => [...prev, record]);
  };

  const handleNext = async () => {
    if (isLastSlide) {

      if (!currentSlide.isAiGenerated) {
          setIsGeneratingNext(true);
          const newSlide = await generatePersonalizedSlide(quizHistory);
          setIsGeneratingNext(false);
          
          if (newSlide) {
             setSlides(prev => [...prev, newSlide]);
             setCurrentSlideIndex(prev => prev + 1);
          } else {
             alert("Great job! That's all for now.");
          }
      }
    } else {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  const handleTutorAsk = async () => {
    if (!tutorQuery.trim()) return;
    setTutorLoading(LoadingState.LOADING);
    const answer = await askTutor(currentSlide.content, tutorQuery);
    setTutorResponse(answer);
    setTutorLoading(LoadingState.SUCCESS);
  };

  return (
    <div className="min-h-[calc(100vh-73px)] bg-[#F5F5F7]
     text-slate-900  p-4 md:p-6 flex items-center justify-center
      selection:bg-blue-100 selection:text-blue-900 relative overflow-hidden">
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl bg-white/80 rounded-md overflow-hidden flex flex-col  relative"
      >

        <div className="pt-8 px-10 pb-2 flex items-center justify-between">

            <div className="flex-1 mx-8 flex space-x-1 h-2">
                {slides.map((_, idx) => (
                    <div 
                        key={idx} 
                        className={`flex-1 rounded-full transition-all duration-500 ${
                            idx <= currentSlideIndex ? 'bg-[#58CC02]' : 'bg-slate-200'
                        }`} 
                    />
                ))}

                {!slides.find(s => s.isAiGenerated) && (
                     <div className="flex-1 rounded-full bg-slate-100 border border-dashed border-slate-300 opacity-50" />
                )}
            </div>
            
        </div>

        <div className="flex-1 px-10 py-6 overflow-hidden scrollbar-hide relative">
            <AnimatePresence mode="wait">
                {isGeneratingNext ? (
                    <motion.div 
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-full flex flex-col items-center justify-center text-center space-y-6"
                    >
                        <div className="relative">
                            <div className="w-24 h-24 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
                            <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500 w-10 h-10" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Analyzing your skills...</h2>
                            <p className="text-slate-500 mt-2">Designing a personalized challenge for you.</p>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key={currentSlide.id}
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="h-full flex flex-col"
                    >

                        <div className="mb-6">
                            <div className="flex items-center space-x-2 mb-2">
                                {currentSlide.isAiGenerated && (
                                    <span className="bg-purple-100 text-purple-600 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wide flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" /> AI Generated
                                    </span>
                                )}
                                <span className="text-slate-400 font-bold text-sm tracking-wider uppercase">{currentSlide.category || "Concept"}</span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">{currentSlide.title}</h1>
                        </div>

                        <p className="text-xl text-slate-600 leading-relaxed mb-8 font-medium">
                            {currentSlide.content}
                        </p>

                        
                        <div className="flex-1 w-full">
                            
                            {currentSlide.interactiveType === 'intro' && (
                               <></>
                            )}

                            {currentSlide.interactiveType === 'graph' && currentSlide.visualization && (
                                <div className="flex flex-col space-y-6">
                                    <FunctionVisualizer config={currentSlide.visualization} interactiveValue={interactiveValue} />
                                    
                                    <div className="bg-slate-100 rounded-3xl p-6">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Interact</span>
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
                                        
                                        let containerClass = "border-2 border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50";
                                        if (isSelected) containerClass = "border-blue-500 bg-blue-50 shadow-[0_0_0_2px_rgba(59,130,246,0.2)]";
                                        
                                        if (quizSubmitted) {
                                            if (isCorrect) containerClass = "border-[#58CC02] bg-green-50";
                                            else if (isSelected) containerClass = "border-red-500 bg-red-50";
                                            else containerClass = "border-slate-100 bg-slate-50 opacity-50";
                                        }

                                        return (
                                            <motion.button 
                                                key={idx}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => !quizSubmitted && setSelectedQuizOption(idx)}
                                                className={`p-5 rounded-2xl text-left text-lg font-bold transition-all flex items-center justify-between ${containerClass}`}
                                            >
                                                <span className={quizSubmitted && isCorrect ? "text-green-700" : (quizSubmitted && isSelected ? "text-red-700" : "text-slate-700")}>
                                                    {option}
                                                </span>
                                                {quizSubmitted && isCorrect && <CheckCircle2 className="text-[#58CC02] w-6 h-6" />}
                                                {quizSubmitted && isSelected && !isCorrect && <XCircle className="text-red-500 w-6 h-6" />}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        <div className={`border-t border-slate-100 bg-slate-50/50 backdrop-blur transition-all duration-300 ${tutorOpen ? 'h-auto' : 'h-0 overflow-hidden'}`}>
             <div className="p-6">
                <div className="flex items-start gap-4">
                    <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs font-bold text-indigo-500 uppercase mb-2">AI Math Tutor</p>
                        
                        {tutorResponse ? (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm text-slate-700 text-sm leading-relaxed"
                            >
                                {tutorResponse}
                                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                                    <button onClick={() => setTutorResponse('')} className="text-xs font-bold text-indigo-600 flex items-center hover:underline">
                                        <RotateCcw className="w-3 h-3 mr-1" /> Ask new question
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="flex gap-2">
                                <input 
                                    value={tutorQuery}
                                    onChange={(e) => setTutorQuery(e.target.value)}
                                    placeholder="Eg. Why is symmetry important?"
                                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2
                                     focus:ring-indigo-500 outline-none shadow-sm"
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
                className={`p-4 rounded-2xl transition-all duration-200 ${tutorOpen ? 'bg-indigo-100 text-indigo-600' : 
                  'bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-500'}`}
            >
                <HelpCircle className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-3 w-full md:w-auto">
                {currentSlideIndex > 0 && (
                    <Button variant="secondary" onClick={handleBack} className="hidden md:flex">
                        Back
                    </Button>
                )}
                
                {currentSlide.interactiveType === 'quiz' && !quizSubmitted ? (
                     <Button 
                        variant="primary" 
                        onClick={handleQuizSubmit}
                        disabled={selectedQuizOption === null}
                        className="w-full md:w-auto bg-[#58CC02] hover:bg-[#46a302] shadow-[0_4px_0_0_#46a302] active:shadow-none active:translate-y-1
                         text-white font-extrabold tracking-wide uppercase"
                     >
                        Check
                     </Button>
                ) : (
                    <Button 
                        onClick={handleNext}
                        className={`w-full md:w-auto font-extrabold tracking-wide uppercase ${
                            isLastSlide && !currentSlide.isAiGenerated && !isGeneratingNext
                            ? 'bg-purple-600 hover:bg-purple-700 shadow-[0_4px_0_0_#7e22ce]' 
                            : 'bg-[#58CC02] hover:bg-[#46a302] shadow-[0_4px_0_0_#46a302]'
                        } text-white active:shadow-none active:translate-y-1`}
                    >
                       {isLastSlide && !currentSlide.isAiGenerated ? (
                           <span className="flex items-center">Generative Challenge <Sparkles className="ml-2 w-4 h-4"/></span>
                       ) : 'Continue'}
                    </Button>
                )}
            </div>
        </div>

      </motion.div>
    </div>
  );
}
