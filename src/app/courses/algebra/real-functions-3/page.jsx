'use client';
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, easeInOut } from 'framer-motion';
import { generateFunctionData, ProgressBar, Navigation, LessonStep } from '../shared';

export const lessonSteps = [
    { 
        title: "Welcome to Function Command Center!", 
        content: "Cadet, today you’re taking control of multiple spacecraft systems—functions! Your mission: master **adding, subtracting, multiplying, dividing, and composing functions** to navigate the cosmos safely. Think of each function as a control module of your ship. Combining them changes your flight trajectory through space." 
    },
    { 
        title: "Adding Function Modules", 
        content: "Let’s start simple. If `f(x) = x + 2` and `g(x) = 3x`, adding these modules gives a new flight path: `(f + g)(x) = f(x) + g(x) = x + 2 + 3x = 4x + 2`. Your ship’s path now combines the thrust patterns of both modules.", 
        interactive: { type: 'graph', func: x => (x + 2) + (3 * x), domain: [-5, 5], initialX: 1 } 
    },
    { 
        title: "Subtracting Function Modules", 
        content: "Subtracting functions adjusts your trajectory differently. Take `f(x) = 2x + 1` and `g(x) = x`. `(f - g)(x) = (2x + 1) - x = x + 1`. The subtraction module changes your net ascent. Your ship climbs slower now.", 
        interactive: { type: 'graph', func: x => (2 * x + 1) - x, domain: [-5, 5], initialX: 0 } 
    },
    { 
        title: "Multiplying Function Modules", 
        content: "Multiplying modules amplifies effects. If `f(x) = x` and `g(x) = x + 1`, then `(f * g)(x) = x * (x + 1) = x² + x`. Suddenly, your trajectory curves like a parabolic orbit! Multiplication can dramatically change your ship’s path.", 
        interactive: { type: 'graph', func: x => x * (x + 1), domain: [-5, 5], initialX: -2 } 
    },
    { 
        title: "Dividing Function Modules", 
        content: "Dividing modules requires caution—divide by zero and you risk disaster! `(f / g)(x) = f(x) / g(x)`. Example: `f(x) = x²`, `g(x) = x`. `(f / g)(x) = x² / x = x`, except at `x = 0`, where the function fails. Think of it as flying too close to a black hole.", 
        interactive: { type: 'graph', func: x => x ** 2 / x, domain: [-5, 5], initialX: 1, asymptote: 0 } 
    },
    { 
        title: "Quiz: Division Danger Zone", 
        content: "Your ship encounters a narrow wormhole. For `(f / g)(x) = (x² - 1) / (x - 1)`, which input will destroy the ship’s system?", 
        interactive: { 
            type: 'quiz', 
            question: 'Identify the input that is not allowed.', 
            options: ['x = 0', 'x = 1', 'x = -1', 'x = 2'], 
            correctAnswer: 'x = 1', 
            hint: 'The denominator is (x - 1). What value makes that zero?' 
        } 
    },
    { 
        title: "Composing Function Modules", 
        content: "Composing functions is like docking two spacecraft: `f(g(x))`. Your output from one module becomes the input to the next. Example: `f(x) = x + 2`, `g(x) = 3x`. Then `(f ∘ g)(x) = f(g(x)) = 3x + 2`. Composition stacks effects for complex trajectories.", 
        interactive: { type: 'graph', func: x => (3 * x) + 2, domain: [-5, 5], initialX: -1 } 
    },
    { 
        title: "Reverse Composition: Order Matters!", 
        content: "Docking in the other order gives a different trajectory! `(g ∘ f)(x) = g(f(x)) = 3*(x + 2) = 3x + 6`. Composition is **not commutative**—order changes your flight path. Always double-check your module order!", 
        interactive: { type: 'graph', func: x => 3 * (x + 2), domain: [-5, 5], initialX: 0 } 
    },
    { 
        title: "Mission Challenge: Plan a Safe Path", 
        content: "You’ve got a flight plan: `f(x) = x²` and `g(x) = x - 1`. Plot `(f + g)(x)`, `(f - g)(x)`, `(f * g)(x)`, `(f / g)(x)`, and `(f ∘ g)(x)` and identify any points of danger.", 
        interactive: { 
            type: 'quiz', 
            question: 'Which operation introduces a restriction in the domain?', 
            options: ['Addition', 'Subtraction', 'Multiplication', 'Division', 'Composition'], 
            correctAnswer: 'Division', 
            hint: 'Look for where the denominator equals zero—this is your danger zone in space!' 
        } 
    },
    { 
        title: "Mission Complete!", 
        content: "Excellent work, space cadet! You can now safely navigate the galaxy using **addition, subtraction, multiplication, division, and composition of functions**. You understand how each operation affects the trajectory of your ship, and you know where to watch for cosmic hazards. Onward to deeper algebraic adventures!" 
    }
];


const OperationsLesson = () => {
  const [step, setStep] = useState(0);
  const [sliderX, setSliderX] = useState(lessonSteps[0]?.interactive?.initialX ?? 0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [showHint, setShowHint] = useState(false);


  const totalSteps = lessonSteps.length;
  const currentStepData = lessonSteps[step];
  const interactiveData = currentStepData.interactive;
  const selectedAnswer = quizAnswers[step];
  const isQuizCorrect = interactiveData?.type === 'quiz' && selectedAnswer === interactiveData.correctAnswer;


  const chartData = useMemo(() => {
    const func = interactiveData?.func || interactiveData?.graph?.func;
    const domain = interactiveData?.domain || interactiveData?.graph?.domain;
    if (func && domain) {
      return generateFunctionData(func, domain, 0.1);
    }
    return [];
  }, [step, interactiveData]);


  const handleNavigation = (direction) => {

    const newStep = step + direction;
    if (newStep >= 0 && newStep < totalSteps) {
      setStep(newStep);

      setSliderX(lessonSteps[newStep]?.interactive?.initialX ?? 0);
      setShowHint(false);
    }
  };

  const handleQuizSelect = (answer) => {
    setQuizAnswers(prev => ({ ...prev, [step]: answer }));
  };

  return (
    <main className="bg-slate-100 min-h-[calc(100vh-65px)] flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl p-6 sm:p-8 md:p-10">
        
        <ProgressBar currentStep={step} totalSteps={totalSteps} />
        
        <Navigation
          onPrev={() => handleNavigation(-1)}
          onNext={() => handleNavigation(1)}
          isPrevDisabled={step === 0}
          isNextDisabled={step === totalSteps - 1 || (interactiveData?.type === 'quiz' && !isQuizCorrect)}
          isLastStep={step === totalSteps - 1}
        />
        
        <motion.div layout transition={{ duration: 0.4, ease: easeInOut}}>
          <AnimatePresence mode="wait">
            <LessonStep
              key={step}
              stepData={currentStepData}
              chartData={chartData}
              sliderValue={sliderX}
              onSliderChange={setSliderX}
              selectedAnswer={selectedAnswer}
              onSelect={handleQuizSelect}
              isCorrect={isQuizCorrect}
              showHint={showHint}
              onToggleHint={() => setShowHint(!showHint)}
            />
          </AnimatePresence>
        </motion.div>
        
      </div>
    </main>
  );
};

export default OperationsLesson;