'use client';
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateFunctionData, ProgressBar, Navigation, LessonStep } from '../shared';


export const lessonSteps = [
    { 
        title: "Welcome to Functions!", 
        content: "Ever wonder how your GPS finds the fastest route or how a video game knows how a character should jump? It's all powered by **functions**. Think of a function as a simple machine: you put a number in, and it spits a new number out. Our mission is to figure out the two big 'rules' for any function: its **Domain** (what can go in) and its **Range** (what can come out)." 
    },
    { 
        title: "The 'Plus 2' Machine", 
        content: "Let's meet our first function machine: `f(x) = x + 2`. Its rule is super simple: whatever number you put in for `x`, it just adds 2. Pop a 5 in, get a 7 out. Easy, right? Give it a try.",
        interactive: { type: 'machine', func: x => x + 2 } 
    },
    { 
        title: "Seeing the Machine at Work", 
        content: "Okay, but what does a function *look* like? We can plot it on a graph. The X-axis (the flat one) is for our inputs, and the Y-axis (the tall one) is for the outputs. Let's graph our `f(x) = x + 2` machine. Drag the slider to see how the output `y` changes for every input `x`.", 
        interactive: { type: 'graph', func: x => x + 2, domain: [-10, 10], initialX: 3 } 
    },
    { 
        title: "The Domain: Allowed Inputs", 
        content: "So, what numbers are we *allowed* to put into our `f(x) = x + 2` machine? Turns out, you can plug in any number you can think of—positive, negative, zero, anything! This complete list of allowed inputs is called the **Domain**. For this function, the domain is 'all real numbers', which is just a fancy way of writing `(-∞, ∞)`.", 
        interactive: { type: 'graph', func: x => x + 2, domain: [-10, 10], initialX: 0, highlight: 'domain' } 
    },
    { 
        title: "The Range: Possible Outputs", 
        content: "If the Domain is what can go *in*, then the **Range** is everything that can possibly come *out*. Since our `f(x) = x + 2` machine can take any input, it can also spit out any output. See how the point can go up and down forever? Its Range is also 'all real numbers', or `(-∞, ∞)`.", 
        interactive: { type: 'graph', func: x => x + 2, domain: [-10, 10], initialX: 0, highlight: 'range' } 
    },
    { 
        title: "Rule #1: Don't Divide by Zero", 
        content: "Now for a function with a big, important rule. What's the one thing you can absolutely never do in math? **You can't divide by zero!** It breaks everything. Let's look at `f(x) = 1/x`. See what happens when you try to make the input `x` equal to 0.", 
        interactive: { type: 'graph', func: x => 1 / x, domain: [-5, 5], initialX: 2, asymptote: 0 } 
    },
    { 
        title: "Handling a Restriction", 
        content: "Our `f(x) = 1/x` machine will break if we feed it a zero. So, its Domain is every single number *except* 0. Notice how the graph gets super close to that vertical line at `x=0` but never actually touches it? That 'electric fence' line is called an **asymptote**. We write this domain as `(-∞, 0) U (0, ∞)`.", 
    },
    { 
        title: "Your Turn! Find the Broken Spot", 
        content: "You've got this. Look at the function `f(x) = 5 / (x - 3)`. What one value for `x` would make you divide by zero?", 
        interactive: { type: 'quiz', question: 'What is the domain of f(x) = 5 / (x - 3)?',
        options: ['All real numbers', 'All real numbers except x = 3', 'All real numbers except x = 5', 'x > 3'], correctAnswer: 'All real numbers except x = 3', hint: 'The bottom part is (x - 3). What would x have to be to make that equal 0?' } 
    },
    { 
        title: "Rule #2: No Negative Square Roots", 
        content: "Alright, division by zero is one math-breaker. Here's the other big one: **you can't take the square root of a negative number** (not with real numbers, anyway!). Let's check out `f(x) = √x`. Drag the slider into the negative zone and see what happens to the graph.", 
        interactive: { type: 'graph', func: x => Math.sqrt(x), domain: [-5, 10], initialX: 4 } 
    },
    { 
        title: "Domain of a Square Root", 
        content: "As you can see, the graph just... stops. It doesn't exist for negative x-values. For `f(x) = √x`, the input must be zero or positive. So, its **Domain** is `[0, ∞)`. The square bracket `[` means that 0 is included! Since the inputs are never negative, the outputs won't be either. The **Range** is also `[0, ∞)`.", 
    },
    { 
        title: "Putting It All Together", 
        content: "Ready for a challenge? For the function `f(x) = √(x - 2)`, what's the smallest number `x` can be? Remember, the stuff inside the square root can't be negative.", 
        interactive: { type: 'quiz', question: 'What is the domain of f(x) = √(x - 2)?', options: ['(-∞, 2)', '(-∞, 2]', '(2, ∞)', '[2, ∞)'], correctAnswer: '[2, ∞)', hint: 'We need to make sure that (x - 2) is 0 or bigger. So, we need to solve x - 2 ≥ 0.' } 
    },
    { 
        title: "You Did It!", 
        content: "And that's a wrap! Great job. You now know the two biggest 'look-out' rules for functions: no dividing by zero and no negative square roots. That's a massive skill to have as you tackle more math. Keep it up!" 
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