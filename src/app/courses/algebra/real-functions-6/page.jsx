'use client';
import React, { useState, useEffect } from 'react';

import Button from '@/components/slides/Button';
import { FunctionVisualizer } from '@/components/visualizations';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Sparkles, HelpCircle, Play, Activity, BrainCircuit, RotateCcw } from 'lucide-react';
import { askTutor, generatePersonalizedSlide } from '@/utils/geminiService';

const LoadingState = Object.freeze({
  IDLE: 'IDLE',
  LOADING: 'LOADING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR'
});


const INITIAL_LESSON_DATA = [
  {
    id: 'intro',
    title: 'The Art of Graphing',
    content: "Graphing is about seeing patterns. In this advanced lesson, we will master function families, transformations, and the logic of piecewise functions. Ready to visualize math?",
    interactiveType: 'intro',
    category: 'Introduction'
  },
  {
    id: 'power-families',
    title: 'Power Families',
    content: "The exponent determines the shape. x¹ is a line, x² is a U-shaped parabola, x³ is an S-curve. Drag the slider to morph the exponent p from 1 to 3.",
    interactiveType: 'graph',
    category: 'Basic Functions',
    visualization: {
      xDomain: [-3, 3],
      yDomain: [-3, 3],
      paramRange: [1, 3],
      paramLabel: "Exponent p",
      elements: [
        { id: 'f_pow', type: 'function', expression: 'x^t', color: '#3b82f6', strokeWidth: 4 },
        { id: 'lbl', type: 'point', x: '1.5', y: '1.5^t', color: '#3b82f6', label: 'y = x^p', r: 0 },
      ]

    }
  },
  {
    id: 'abs-transform',
    title: 'Absolute Transformations',
    content: "The Absolute Value function f(x) = |x| creates a V-shape. Multiplying by a coefficient 'a' stretches it. If 'a' is negative, it reflects downwards.",
    interactiveType: 'graph',
    category: 'Transformations',
    visualization: {
      xDomain: [-5, 5],
      yDomain: [-5, 5],
      paramRange: [-2, 2],
      paramLabel: "Coeff a",
      elements: [
        { id: 'f_abs', type: 'function', expression: 't * abs(x)', color: '#ec4899', strokeWidth: 4 },
        { id: 'origin', type: 'point', x: '0', y: '0', color: '#ec4899', r: 5 },
        { id: 'ref_p', type: 'point', x: '2', y: 't * abs(2)', color: '#ec4899', label: 'y = a|x|', r: 6 }
      ]
    }
  },

  {
    id: 'piecewise-concept',
    title: 'Piecewise Logic',
    content: "A piecewise function applies different rules to different parts of the domain. Here, we switch from a line to a constant at x = k. Drag k to move the boundary.",
    interactiveType: 'graph',
    category: 'Piecewise',
    visualization: {
      xDomain: [-4, 6],
      yDomain: [-2, 6],
      paramRange: [-2, 4],
      paramLabel: "Split k",

      elements: [

        { id: 'left', type: 'function', expression: '(x < t) ? x + 2 : NaN', color: '#3b82f6', strokeWidth: 4 },
        { id: 'right', type: 'function', expression: '(x >= t) ? 3 : NaN', color: '#f97316', strokeWidth: 4 },

        { id: 'bound', type: 'v-line', x: 't', color: '#94a3b8', style: 'dashed', label: 'x = k' },
       
        { id: 'p_join', type: 'point', x: 't', y: '3', color: '#f97316', r: 6, label: 'Switch' }
      ]
    }
  },
  {
    id: 'puzzle-continuity',
    title: 'Repair the Graph',
    content: "A function is continuous if the pieces meet. Here we have f(x) = -x (left) and f(x) = (x-1)² + c (right). Adjust c to make them connect at x=1.",
    interactiveType: 'graph',
    category: 'Puzzle',
    visualization: {
      xDomain: [-2, 4],
      yDomain: [-2, 6],
      paramRange: [-2, 2],
      paramLabel: "Shift c",
      elements: [

        { id: 'f_left', type: 'function', expression: '(x < 1) ? -x + 2 : NaN', color: '#ef4444', strokeWidth: 4 },


        { id: 'f_right', type: 'function', expression: '(x >= 1) ? (x-1)^2 + t : NaN', color: '#10b981', strokeWidth: 4 },

        { id: 'target', type: 'point', x: '1', y: '1', color: '#ef4444', r: 4, label: 'Target' },

        { id: 'mover', type: 'point', x: '1', y: 't', color: '#10b981', r: 6 }
      ]
    }
  },
  {
    id: 'step-function',
    title: 'The Step Function',
    content: "The Floor function ⌊x⌋ rounds down to the nearest integer, creating a staircase. Scaling the input changes the step width. Graph: y = floor(x/s).",
    interactiveType: 'graph',
    category: 'Advanced Types',
    visualization: {
      xDomain: [-5, 5],
      yDomain: [-3, 3],
      paramRange: [1, 2.5],
      paramLabel: "Scale s",
      elements: [
        { id: 'step_f', type: 'function', expression: 'floor(x/t)', color: '#8b5cf6', strokeWidth: 3 },
        { id: 'tracer', type: 'point', x: '2', y: 'floor(2/t)', color: '#8b5cf6', r: 6, label: '⌊2/s⌋' }
      ]
    }

  },
  {
    id: 'quiz-piecewise',
    title: 'Knowledge Check',
    content: "Which value of k makes the function f(x) = { 2x (x<1), x+k (x≥1) } continuous?",
    interactiveType: 'quiz',
    quizOptions: ['k = 0', 'k = 1', 'k = 2', 'k = -1'],
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
