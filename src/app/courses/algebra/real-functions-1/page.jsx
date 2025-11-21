'use client';
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateFunctionData, ProgressBar, Navigation, LessonStep } from '../shared';

export const lessonSteps = [
    { 
        title: "Welcome to Galactic Functions!", 
        content: "Strap in, boy! Ever wonder how a spacecraft computes its landing path or how a rover knows exactly where to drive on Mars? It's all powered by **functions**. Think of a function as a control panel on your ship: you input one number, and it outputs another. Our mission today is to master the two big rules every function-computer follows: its **Domain** (what values are allowed to go in) and its **Range** (what values can come out)." 
    },
    { 
        title: "The 'Plus 2' Thruster", 
        content: "Meet your first system: `f(x) = x + 2`. This thruster module simply takes your input fuel value and boosts it by 2 units. Input a power level of 5, and your thruster outputs 7. Smooth flight! Give it a test run.",
        interactive: { type: 'machine', func: x => x + 2 } 
    },
    { 
        title: "Plotting the Flight Path", 
        content: "But what does this thruster's behavior **look** like in space? We can chart its trajectory. The X-axis is your input (fuel level), and the Y-axis is your output (thrust). Let’s graph `f(x) = x + 2`. Slide through values and watch how your output changes across the flight path.", 
        interactive: { type: 'graph', func: x => x + 2, domain: [-10, 10], initialX: 3 } 
    },
    { 
        title: "The Domain: Safe Input Zones", 
        content: "When entering values into your thruster, what numbers are actually **allowed**? For `f(x) = x + 2`, any real number works—positive, negative, zero, cosmic dust, anything! This complete set of allowable inputs is the **Domain**. In this case, it's all real numbers, which astronomers write as `(-∞, ∞)`.", 
        interactive: { type: 'graph', func: x => x + 2, domain: [-10, 10], initialX: 0, highlight: 'domain' } 
    },
    { 
        title: "The Range: Possible Output Levels", 
        content: "If the Domain is what can enter the thruster, the **Range** is all the thrust levels that can come out. Since the input can be anything, the output can be anything too—your ship can accelerate to any height in the graph. The Range is also `(-∞, ∞)`.", 
        interactive: { type: 'graph', func: x => x + 2, domain: [-10, 10], initialX: 0, highlight: 'range' } 
    },
    { 
        title: "Rule #1: The Black Hole of Division by Zero", 
        content: "Time to examine a more dangerous system. In the galaxy of mathematics, there's one thing you absolutely never want your ship's computer to do: **divide by zero**. It’s like flying straight into a black hole—everything breaks! Take a look at `f(x) = 1/x`. Watch what happens as your input approaches 0.", 
        interactive: { type: 'graph', func: x => 1 / x, domain: [-5, 5], initialX: 2, asymptote: 0 } 
    },
    { 
        title: "Avoiding the Zero Singularity", 
        content: "The function `f(x) = 1/x` crashes if your input hits zero. That means its Domain is every number *except* 0. Notice how the graph approaches that vertical danger line at `x = 0` but never touches it? That's an **asymptote**, like a gravitational barrier your ship can’t cross. The domain is `(-∞, 0) U (0, ∞)`.", 
    },
    { 
        title: "Your Turn, Pilot! Identify the Danger Zone", 
        content: "You’ve got the controls now. For the function `f(x) = 5 / (x - 3)`, which input would pull you into the zero singularity? (Hint: what makes the denominator zero?)", 
        interactive: { 
            type: 'quiz', 
            question: 'What is the domain of f(x) = 5 / (x - 3)?',
            options: [
                'All real numbers', 
                'All real numbers except x = 3', 
                'All real numbers except x = 5', 
                'x > 3'
            ], 
            correctAnswer: 'All real numbers except x = 3', 
            hint: 'The bottom part is (x - 3). What would x have to be to make that equal 0?' 
        } 
    },
    { 
        title: "Rule #2: No Imaginary Fuel (Negative Square Roots)", 
        content: "Here’s another key system limitation: your ship's real-number computer **cannot process the square root of a negative number**. That’s imaginary-fuel territory—only complex-number ships can handle that! Try `f(x) = √x` and slide into the negative zone. See how the graph disappears?", 
        interactive: { type: 'graph', func: x => Math.sqrt(x), domain: [-5, 10], initialX: 4 } 
    },
    { 
        title: "Domain of the Square-Root Scanner", 
        content: "Since the square-root scanner can only process values that are zero or greater, the Domain of `f(x) = √x` is `[0, ∞)`. And because outputs can’t go negative either, the Range is also `[0, ∞)`.", 
    },
    { 
        title: "Mission Challenge: Check the Scanner Limits", 
        content: "Final mission! For the function `f(x) = √(x - 2)`, what is the smallest value `x` can be? Remember, the inside of the square root must stay non-negative to avoid system failure.", 
        interactive: { 
            type: 'quiz', 
            question: 'What is the domain of f(x) = √(x - 2)?', 
            options: ['(-∞, 2)', '(-∞, 2]', '(2, ∞)', '[2, ∞)'], 
            correctAnswer: '[2, ∞)', 
            hint: 'We need (x - 2) to be 0 or greater. Solve x - 2 ≥ 0.' 
        } 
    },
    { 
        title: "Mission Complete!", 
        content: "Cool work, explorer! You’ve mastered the two important laws of galactic functions: never divide by zero, and never take the square root of a negative number (unless you’re flying an imaginary-number cruiser). Your ship’s computer is now certified for deep-space calculations. Onward to the next mission!" 
    }
];




const RealFunctionsLesson = () => {
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
         
         <motion.div layout transition={{ duration: 0.4, ease: [0.45, 0, 0.55, 1] }}>
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

export default RealFunctionsLesson;