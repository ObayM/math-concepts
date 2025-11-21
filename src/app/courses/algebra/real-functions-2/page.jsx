'use client';
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, easeInOut } from 'framer-motion';
import { generateFunctionData, ProgressBar, Navigation, LessonStep } from '../shared';

export const lessonSteps = [
    { 
        title: "Navigating Cosmic Paths", 
        content: "Imagine piloting your spacecraft along the trajectory of a function's graph from **left to right** across the galaxy. Are you climbing to orbit, descending into a planet’s gravity well, or cruising along flat space? This idea is key to understanding **monotonicity**—it tells us where a function (your flight path) is increasing, decreasing, or constant." 
    },
    { 
        title: "Ascending Functions: Climbing to Orbit", 
        content: "An **increasing** function is like a spacecraft always climbing higher as it travels forward. In math terms, as the `x`-value increases, the `y`-value also rises. Check out `f(x) = 2x + 1`. No matter where you are on the graph, your ship is always ascending!", 
        interactive: { type: 'graph', func: x => 2 * x + 1, domain: [-5, 5], initialX: -2 } 
    },
    { 
        title: "Descending Functions: Gravity Wells", 
        content: "A **decreasing** function is the opposite: your spacecraft is descending as you move forward. As `x` increases, `y` decreases. The function `f(x) = -x + 3` represents a smooth descent into a gravity well. Steady downhill flight!", 
        interactive: { type: 'graph', func: x => -x + 3, domain: [-5, 5], initialX: -3 } 
    },
    { 
        title: "Twists in the Trajectory: Non-Monotonic Functions", 
        content: "Some flight paths twist through space. For example, `f(x) = x²` descends at first, then loops around and climbs! A function that isn’t always ascending or always descending is **non-monotonic**. We can describe its behavior in sections, or **intervals** of space.", 
        interactive: { type: 'graph', func: x => x * x, domain: [-5, 5], initialX: 3, turningPoint: { x: 0, label: 'Turning Point' } } 
    },
    { 
        title: "Charting the Intervals", 
        content: "Analyzing `f(x) = x²`, the spacecraft changes direction at its lowest point, `x = 0`. So we say the path is **descending** on `(-∞, 0)` and **ascending** on `(0, ∞)`. That turning point is your key navigational landmark!", 
        interactive: { type: 'graph', func: x => x * x, domain: [-5, 5], initialX: -4, turningPoint: { x: 0, label: 'x = 0' } } 
    },
    { 
        title: "Quiz: Pilot the Function", 
        content: "Time to test your navigation skills! Examine the graph of `f(x) = -(x - 2)² + 1`. On which interval is the spacecraft **ascending**? Find the peak first!", 
        interactive: { 
            type: 'quiz', 
            question: 'On what interval is f(x) = -(x - 2)² + 1 increasing?', 
            options: ['(-∞, 2)', '(2, ∞)', '(-∞, 1)', '(1, ∞)'], 
            correctAnswer: '(-∞, 2)', 
            hint: 'The turning point (the peak of the orbit) is at x = 2. The ship climbs before reaching the peak.', 
            graph: { func: x => -((x - 2) ** 2) + 1, domain: [-2, 6] } 
        } 
    },
    { 
        title: "Flat Flight: Constant Functions", 
        content: "What if your ship cruises along a perfectly flat path? That’s a **constant** function. As `x` changes, `y` stays the same. For `f(x) = 4`, your ship maintains a steady altitude of 4 units across all x-values.", 
        interactive: { type: 'graph', func: x => 4, domain: [-5, 5], initialX: -3 } 
    },
    { 
        title: "Mission Complete!", 
        content: "Congratulations, pilot! You can now read a spacecraft’s trajectory: **ascending** (uphill), **descending** (downhill), or **flat** (constant). You can also pinpoint **intervals** of each behavior. Your cosmic navigation skills are ready for interstellar missions!" 
    }
];



const MonotonicityLesson = () => {
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

export default MonotonicityLesson;