'use client';
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, easeInOut } from 'framer-motion';
import { generateFunctionData, ProgressBar, Navigation, LessonStep } from '../shared';

const lessonSteps = [
    { 
        title: "Going Uphill or Downhill?", 
        content: "Imagine walking along the path of a function's graph from **left to right**. Are you going uphill, downhill, or is the path flat? This simple idea is the key to understanding **monotonicity**! It's the term we use to describe where a function is increasing, decreasing, or constant." 
    },
    { 
        title: "Strictly Increasing Functions", 
        content: "An **increasing** function is one where you're always going uphill as you move from left to right. In math terms, as the `x`-value gets bigger, the `y`-value *also* gets bigger. Look at the function `f(x) = 2x + 1`. No matter where you are on the graph, you're always moving up!",
        interactive: { type: 'graph', func: x => 2 * x + 1, domain: [-5, 5], initialX: -2 } 
    },
    { 
        title: "Strictly Decreasing Functions", 
        content: "A **decreasing** function is the opposite: you're always going downhill. As the `x`-value gets bigger, the `y`-value gets *smaller*. The function `f(x) = -x + 3` is a perfect example. It's a constant downhill journey.",
        interactive: { type: 'graph', func: x => -x + 3, domain: [-5, 5], initialX: -3 } 
    },
    { 
        title: "Doing Both: Non-Monotonic Functions", 
        content: "What about a function like a parabola, `f(x) = x²`? It goes downhill for a while, then turns around and goes uphill! A function that isn't *always* increasing or *always* decreasing is called **non-monotonic**. However, we can describe its behavior on specific sections, or **intervals**.",
        interactive: { type: 'graph', func: x => x * x, domain: [-5, 5], initialX: 3, turningPoint: { x: 0, label: 'Turning Point' } } 
    },
    { 
        title: "Finding the Intervals", 
        content: "Let's analyze `f(x) = x²`. By looking at the graph, we can see it changes direction at its lowest point, `x = 0`. So, we say the function is **decreasing** on the interval `(-∞, 0)` and **increasing** on the interval `(0, ∞)`. The turning point is the key!",
        interactive: { type: 'graph', func: x => x * x, domain: [-5, 5], initialX: -4, turningPoint: { x: 0, label: 'x = 0' } } 
    },
    { 
        title: "Quiz: Analyze the Function", 
        content: "Time to test your skills! Look at the graph of the function `f(x) = -(x - 2)² + 1`. On what interval is this function **increasing**? Find the turning point first!",
        interactive: { 
            type: 'quiz', 
            question: 'On what interval is f(x) = -(x - 2)² + 1 increasing?', 
            options: ['(-∞, 2)', '(2, ∞)', '(-∞, 1)', '(1, ∞)'], 
            correctAnswer: '(-∞, 2)', 
            hint: 'The turning point (the peak of the hill) is at x = 2. The function goes uphill *before* it reaches the peak.',
            graph: { func: x => -((x - 2) ** 2) + 1, domain: [-2, 6] }
        } 
    },
    { 
        title: "The Special Case: Constant Functions", 
        content: "What if the path is completely flat? This is a **constant** function. As the `x`-value changes, the `y`-value stays exactly the same. For `f(x) = 4`, the output is always 4, no matter the input.",
        interactive: { type: 'graph', func: x => 4, domain: [-5, 5], initialX: -3 } 
    },
    { 
        title: "Lesson Complete!", 
        content: "Fantastic job! You now know how to analyze a function's monotonicity. You can identify if it's **increasing** (uphill), **decreasing** (downhill), or **constant** (flat), and you can pinpoint the **intervals** where each behavior occurs. This is a fundamental skill for understanding functions!" 
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