'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot, ResponsiveContainer } from 'recharts';
import { FaArrowRight, FaArrowLeft, FaCheckCircle, FaTimesCircle, FaLightbulb } from 'react-icons/fa';
import clsx from 'clsx';

export const StyledContent = ({ text }) => {
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

export const generateFunctionData = (func, domain = [-10, 10], step = 0.1) => {
  const data = [];
  for (let x = domain[0]; x <= domain[1]; x += step) {
    const y = func(x);
    if (isFinite(y)) {
      data.push({ x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(2)) });
    }
  }
  return data;
};

export const ProgressBar = ({ currentStep, totalSteps }) => {
  const progress = ((currentStep + 1) / totalSteps) * 100;
  return (
    <div className="mb-4">
      <span className="text-sm font-semibold text-slate-600">Progress: Step {currentStep + 1} of {totalSteps}</span>
      <div className="w-full bg-slate-200 rounded-full h-2.5 mt-1">
        <motion.div
          className="bg-linear-to-r from-blue-500 to-cyan-400 h-2.5 rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};



const Navigation = ({ onPrev, onNext, isPrevDisabled, isNextDisabled, isLastStep }) => (
  <div className="flex justify-between items-center mt-6 mb-6 pb-6 border-b border-slate-200">
    <motion.button
      onClick={onPrev}
      disabled={isPrevDisabled}
      className="flex items-center gap-2 py-2 px-5 font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
      whileHover={{ scale: !isPrevDisabled ? 1.05 : 1 }}
      whileTap={{ scale: !isPrevDisabled ? 0.98 : 1 }}
    >
      <FaArrowLeft /> Previous
    </motion.button>
    <motion.button
      onClick={onNext}
      disabled={isNextDisabled}
      className="flex items-center gap-2 py-2 px-5 font-semibold text-white bg-linear-to-r from-blue-500 to-cyan-500 rounded-lg shadow-md transition-all duration-200 disabled:from-slate-400 disabled:to-slate-500 disabled:shadow-none disabled:cursor-not-allowed hover:shadow-lg hover:-translate-y-px"
    >
      {isLastStep ? 'Finish' : 'Next'} <FaArrowRight />
    </motion.button>
  </div>
);


const InteractiveGraph = ({ config, chartData, sliderValue, onSliderChange }) => {
  const yValue = config.func(sliderValue);
  const domain = config.domain || [-10, 10];

  return (
    <div className="text-center bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-6 my-8">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>

          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="x" type="number" domain={domain} stroke="#9ca3af" label={{ value: 'Input (x)', position: 'insideBottom', offset: -10, fill: '#6b7280' }} />

          <YAxis type="number" domain={['auto', 'auto']} stroke="#9ca3af" label={{ value: 'Output (y)', angle: -90, position: 'insideLeft', offset: 10, fill: '#6b7280' }} />
          <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(5px)', border: '1px solid #ddd', borderRadius: '0.5rem' }} />

          <Line type="monotone" dataKey="y" stroke="#3b82f6" strokeWidth={3} dot={false} />
          {isFinite(yValue) && <ReferenceDot x={sliderValue} y={yValue} r={8} fill="#ef4444" stroke="white" strokeWidth={2} isFront={true} />}

          {config.turningPoint && <ReferenceDot x={config.turningPoint.x} y={config.func(config.turningPoint.x)} r={8} fill="#10b981" stroke="white" strokeWidth={2} isFront={true} label={config.turningPoint.label} />}
        </LineChart>
      </ResponsiveContainer>

      <input
        type="range" min={domain[0]} max={domain[1]} step="0.1" value={sliderValue}
        onChange={(e) => onSliderChange(parseFloat(e.target.value))}
        className="w-full md:w-4/5 mt-4 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
      <p className="mt-4 text-slate-600 font-medium">
        Current Input <code className="bg-blue-100 text-blue-800 font-mono text-sm py-1 px-2 rounded-md">x = {sliderValue.toFixed(2)}</code> leads to Output <code className="bg-blue-100 text-blue-800 font-mono text-sm py-1 px-2 rounded-md">y = {isFinite(yValue) ? yValue.toFixed(2) : 'Undefined'}</code>
      </p>
    </div>
  );
};


const InteractiveQuiz = ({ config, chartData, selectedAnswer, onSelect, isCorrect, showHint, onToggleHint }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 my-8 text-left">

    {config.graph && (
      <div className="mb-6 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" type="number" domain={config.graph.domain} />
            <YAxis type="number" domain={['auto', 'auto']} />
            <Tooltip />
            <Line type="monotone" dataKey="y" stroke="#3b82f6" strokeWidth={3} dot={false} />
            <ReferenceDot x={2} y={config.graph.func(2)} r={8} fill="#10b981" stroke="white" strokeWidth={2} isFront={true} label="Turning Point" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )}

    <h4 className="text-xl font-semibold text-slate-800 mb-4">{config.question}</h4>
    <div className="space-y-3">
      {config.options.map((option, index) => (
        <button
          key={index}
          onClick={() => onSelect(option)}
          className={clsx('w-full p-4 text-left rounded-lg border-2 transition-all duration-200', {
            'bg-green-100 border-green-500 text-green-800': selectedAnswer === option && isCorrect,
            'bg-red-100 border-red-500 text-red-800': selectedAnswer === option && !isCorrect,
            'bg-white border-slate-300 hover:border-blue-500 hover:bg-blue-50': selectedAnswer !== option,
          })}
        >
          {option}
        </button>
      ))}
    </div>

    {selectedAnswer && (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={clsx('mt-4 p-4 rounded-lg flex items-center gap-3 font-medium', {
        'bg-green-100 text-green-700': isCorrect,
        'bg-red-100 text-red-700': !isCorrect,
      })}>
        {isCorrect ? <FaCheckCircle /> : <FaTimesCircle />}
        {isCorrect ? "Exactly! You found the interval before the peak." : "Not quite. Remember to read the graph from left to right."}
      </motion.div>
    )}

    {!isCorrect && config.hint && (
      <div className="mt-4">
        <button onClick={onToggleHint} className="flex items-center gap-2 text-sm text-yellow-800 font-semibold hover:underline">
          <FaLightbulb /> {showHint ? 'Hide hint' : 'Need a hint?'}
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
                {config.hint}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )}
  </div>
);


const InteractiveElement = (props) => {
  const { interactiveData } = props;
  if (!interactiveData) return null;

  switch (interactiveData.type) {
    case 'graph':
      return <InteractiveGraph config={interactiveData} {...props} />;
    case 'quiz':
      return <InteractiveQuiz config={interactiveData} {...props} />;
    default:
      return null;
  }
};


const LessonStep = ({ stepData, ...interactiveProps }) => {
  const animationVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <motion.div
      variants={animationVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">{stepData.title}</h1>
      <div className="text-lg text-slate-600 leading-relaxed space-y-4">
        <StyledContent text={stepData.content} />
      </div>
      <InteractiveElement interactiveData={stepData.interactive} {...interactiveProps} />
    </motion.div>
  );
};

export { LessonStep, InteractiveQuiz, InteractiveElement, InteractiveGraph, Navigation };

export const funcMap = {
  'add2': x => x + 2,
  'inverse': x => 1 / x,
  'sqrt': x => Math.sqrt(x),
  'quiz1': x => 5 / (x - 3),
  'quiz2': x => Math.sqrt(x - 2),


  'linear_inc': x => 2 * x + 1,
  'linear_dec': x => -x + 3,
  'square': x => x * x,
  'square_shifted': x => -((x - 2) ** 2) + 1,
  'constant': x => 4,


  'add_ops': x => (x + 2) + (3 * x),
  'sub_ops': x => (2 * x + 1) - x,
  'mul_ops': x => x * (x + 1),
  'div_ops': x => x ** 2 / x,
  'comp_ops': x => (3 * x) + 2,
  'comp_ops_rev': x => 3 * (x + 2),
};



