'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot, ReferenceLine, ResponsiveContainer } from 'recharts';
import { FaArrowRight, FaCheckCircle, FaTimesCircle, FaLightbulb } from 'react-icons/fa';
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {  FaArrowLeft } from 'react-icons/fa';
import clsx from 'clsx';

export const FunctionMachine = ({ interactiveData, sliderX, onSliderChange }) => {

  const output = interactiveData.func(sliderX);

  return (
    <div className="text-center bg-slate-50 border border-slate-200 rounded-xl p-6">

      <div className="flex justify-center items-center gap-4 md:gap-6 flex-wrap text-xl md:text-2xl font-medium">

        <span className="text-slate-700">INPUT: {sliderX.toFixed(1)}</span>

        <FaArrowRight className="text-blue-500 text-3xl shrink-0" />

        <div className="border-2 border-dashed border-blue-400 py-2 px-4 rounded-lg">
          <code className="bg-blue-100 text-blue-800 font-mono text-lg py-1 px-2 rounded-md">f(x) = x + 2</code>
        </div>

        <FaArrowRight className="text-blue-500 text-3xl shrink-0" />

        <span className="text-slate-700">OUTPUT: {output.toFixed(1)}</span>

      </div>

      <input
        type="range"
        min="-10" max="10" step="0.1" value={sliderX}
        onChange={(e) => onSliderChange(parseFloat(e.target.value))}
        className="w-full md:w-4/5 mt-6 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />

    </div>
  );
};


export const GraphInteractive = ({ interactiveData, chartData, sliderX, onSliderChange }) => {

  const yValue = interactiveData.func(sliderX);
  const domain = interactiveData.domain || [-10, 10];

  return (
    <div className="text-center bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-6">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          
          <XAxis dataKey="x" type="number" domain={domain} stroke="#9ca3af" label={{ value: 'Input (x)', position: 'insideBottom', offset: -10, fill: '#6b7280' }} />
          
          <YAxis stroke="#9ca3af" label={{ value: 'Output (y)', angle: -90, position: 'insideLeft', offset: 10, fill: '#6b7280' }} />


          <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(5px)', border: '1px solid #ddd', borderRadius: '0.5rem' }} />
          <Line type="monotone" dataKey="y" stroke="#3b82f6" strokeWidth={3} dot={false} />
          
          {isFinite(yValue) && <ReferenceDot x={sliderX} y={yValue} r={8} fill="#ef4444" stroke="white" strokeWidth={2} isFront={true} />}
          
          {interactiveData.highlight === 'domain' && <ReferenceLine x={sliderX} stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" />}

          {interactiveData.highlight === 'range' && isFinite(yValue) && <ReferenceLine y={yValue} stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" />}

          {interactiveData.asymptote !== undefined && <ReferenceLine x={interactiveData.asymptote} stroke="#ef4444" strokeWidth={2}
           strokeDasharray="5 5" label={{ value: 'Asymptote!', fill: '#ef4444', position: 'insideTopRight' }} />}
        </LineChart>
      </ResponsiveContainer>

      <input
        type="range" min={domain[0]} max={domain[1]} step="0.1" value={sliderX}
        onChange={(e) => onSliderChange(parseFloat(e.target.value))}
        className="w-full md:w-4/5 mt-4 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
      <p className="mt-4 text-slate-600 font-medium">
          Current Input 
          <code className="bg-blue-100 text-blue-800 font-mono text-sm py-1 px-2 rounded-md">
            x = {sliderX.toFixed(2)}
        </code> 
        leads to Output
         <code className="bg-blue-100 text-blue-800 font-mono text-sm py-1 px-2 rounded-md">
         y = {isFinite(yValue) ? yValue.toFixed(2) : 'Undefined!'}
        </code>
      </p>
    </div>
  );
};

export const Quiz = ({ interactiveData, selectedAnswer, onSelectAnswer }) => {
  const [showHint, setShowHint] = useState(false);
  const isCorrect = selectedAnswer === interactiveData.correctAnswer;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-left">
      <h4 className="text-xl font-semibold text-slate-800 mb-4">{interactiveData.question}</h4>
      <div className="space-y-3">
        {interactiveData.options.map((option, index) => {
          const isSelected = selectedAnswer === option;
          return (
            <button
              key={index}
              onClick={() => onSelectAnswer(option)}
              className={clsx(
                'w-full p-4 text-left rounded-lg border-2 transition-all duration-200 font-medium',
                {
                  'bg-green-100 border-green-500 text-green-800': isSelected && isCorrect,
                  'bg-red-100 border-red-500 text-red-800': isSelected && !isCorrect,
                  'bg-white border-slate-300 hover:border-blue-500 hover:bg-blue-50': !isSelected,
                }
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
      
      {selectedAnswer && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={clsx('mt-4 p-4 rounded-lg flex items-center gap-3 font-medium', {
            'bg-green-100 text-green-700': isCorrect,
            'bg-red-100 text-red-700': !isCorrect,
          })}
        >
          {isCorrect ? <FaCheckCircle/> : <FaTimesCircle/>}
          <span>{isCorrect ? "That's right! Great job." : "Not quite. Check the hint if you're stuck!"}</span>
        </motion.div>
      )}

      {!isCorrect && interactiveData.hint && (
        <div className="mt-4">
            <button onClick={() => setShowHint(!showHint)} className="flex items-center gap-2 text-sm text-yellow-800 font-semibold hover:underline">
                <FaLightbulb /> Need a hint?
            </button>
            <AnimatePresence>
                {showHint && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-2 p-3 rounded-lg bg-yellow-50 text-yellow-800 border border-dashed border-yellow-300">
                           {interactiveData.hint}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      )}
    </div>
  );
};



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


const generateFunctionData = (func, domain = [-10, 10], step = 0.1) => {
  const data = [];
  for (let x = domain[0]; x <= domain[1]; x += step) {
    const y = func(x);
    if (isFinite(y)) {
      data.push({ x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(2)) });
    }
  }
  return data;
};

const StyledContent = ({ text }) => {
    return text.split('**').map((part, index) => 
        index % 2 === 1 
            ? <strong key={index} className="font-semibold text-slate-900">{part}</strong> 
            : part.split('`').map((subPart, subIndex) => 
                subIndex % 2 === 1 
                    ? <code key={`${index}-${subIndex}`} className="bg-blue-100 text-blue-800 font-mono text-sm py-0.5 px-1.5 rounded-md">{subPart}</code> 
                    : subPart
            )
    );
};

const RealFunctionsLesson = () => {
  const [step, setStep] = useState(0);

  const [sliderX, setSliderX] = useState(lessonSteps[0]?.interactive?.initialX ?? 0);

  const [quizAnswers, setQuizAnswers] = useState({});

  const totalSteps = lessonSteps.length;
  const currentStepData = lessonSteps[step];
  const interactiveData = currentStepData.interactive;

  const isQuizCorrect = interactiveData?.type === 'quiz' && quizAnswers[step] === interactiveData.correctAnswer;

  const handleNavigation = (direction) => {
    const newStep = step + direction;

    if (newStep >= 0 && newStep < totalSteps) {
      setStep(newStep);

      setSliderX(lessonSteps[newStep]?.interactive?.initialX ?? 0);
    }
  };

  const handleQuizSelect = (answer) => {
    setQuizAnswers(prev => ({ ...prev, [step]: answer }));
  };
  
  const progress = ((step + 1) / totalSteps) * 100;
  
  const chartData = useMemo(() => {
    if (interactiveData?.type === 'graph') {
      return generateFunctionData(interactiveData.func, interactiveData.domain, 0.1);
    }
    return [];
  }, [step, interactiveData]);

  const animationVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  const renderInteractiveElement = () => {
    if (!interactiveData) return null;

    switch (interactiveData.type) {
      case 'machine':
        return <FunctionMachine interactiveData={interactiveData} sliderX={sliderX} onSliderChange={setSliderX} />;
      case 'graph':
        return <GraphInteractive interactiveData={interactiveData} chartData={chartData} sliderX={sliderX} onSliderChange={setSliderX} />;
      case 'quiz':
        return <Quiz interactiveData={interactiveData} selectedAnswer={quizAnswers[step]} onSelectAnswer={handleQuizSelect} />;
      default:
        return null;
    }

  };

  return (
    <main className="bg-slate-100 min-h-[calc(100vh-65px)] flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl p-6 sm:p-8 md:p-10">
        

        <div className="mb-4">
            <span className="text-sm font-semibold text-slate-600">Progress: Step {step + 1} of {totalSteps}</span>
            <div className="w-full bg-slate-200 rounded-full h-2.5 mt-1">
                <motion.div
                    className="bg-linear-to-r from-blue-500 to-cyan-400 h-2.5 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                />
            </div>
        </div>
        

        <div className="flex justify-between items-center mt-6 mb-6 pb-6 border-b border-slate-200">
          
          <motion.button
            onClick={() => handleNavigation(-1)}
            disabled={step === 0}
            className="flex items-center gap-2 py-2 px-5 font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm transition-all
             duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            whileHover={{ scale: step > 0 ? 1.05 : 1 }}
            whileTap={{ scale: step > 0 ? 0.98 : 1 }}
          >
            <FaArrowLeft /> Previous
          </motion.button>
          
          <motion.button
            onClick={() => handleNavigation(1)}
            disabled={step === totalSteps - 1 || (interactiveData?.type === 'quiz' && !isQuizCorrect)}
            className="flex items-center gap-2 py-2 px-5 font-semibold text-white bg-linear-to-r from-blue-500 to-cyan-500 rounded-lg shadow-md transition-all duration-200
             disabled:from-slate-400 disabled:to-slate-500 disabled:shadow-none disabled:cursor-not-allowed hover:shadow-lg hover:-translate-y-px"
          >
            {step === totalSteps - 1 ? 'Finish' : 'Next'} <FaArrowRight />
          </motion.button>
        </div>
        

        <motion.div layout transition={{ duration: 0.3, ease: "easeInOut" }}>
            <AnimatePresence mode="wait">
                <motion.div
                key={step}
                variants={animationVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">{currentStepData.title}</h1>
                <div className="text-lg text-slate-600 leading-relaxed space-y-4">
                    <StyledContent text={currentStepData.content} />
                </div>

                <div className="mt-8">
                  {renderInteractiveElement()}
                </div>
                </motion.div>
            </AnimatePresence>
        </motion.div>
      </div>
    </main>
  );
};

export default RealFunctionsLesson;