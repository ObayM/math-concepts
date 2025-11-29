'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateFunctionData, ProgressBar, Navigation, LessonStep, funcMap } from './shared';

const LessonTemplate = ({ lessonData }) => {

    const lessonSteps = lessonData;
    const [step, setStep] = useState(0);
    const [sliderX, setSliderX] = useState(lessonSteps[0]?.interactive?.initialX ?? 0);
    const [quizAnswers, setQuizAnswers] = useState({});
    const [showHint, setShowHint] = useState(false);
    const [streak, setStreak] = useState(null);

    const totalSteps = lessonSteps.length;
    const currentStepData = lessonSteps[step];
    const interactiveData = currentStepData.interactive;
    const selectedAnswer = quizAnswers[step];
    const isQuizCorrect = interactiveData?.type === 'quiz' && selectedAnswer === interactiveData.correctAnswer;

    useEffect(() => {
        fetch('/api/streak')
            .then(res => res.json())
            .then(data => {
                if (data.streak !== undefined) setStreak(data.streak);
            })
            .catch(err => console.error('Failed to fetch streak:', err));
    }, []);


    useEffect(() => {
        if (step === totalSteps - 1) {
            fetch('/api/update-activity', { method: 'POST' })
                .then(res => res.json())
                .then(() => {

                    fetch('/api/streak')
                        .then(res => res.json())
                        .then(data => {
                            if (data.streak !== undefined) setStreak(data.streak);
                        });
                })
                .catch(err => console.error('Failed due to this ->', err));
        }
    }, [step, totalSteps]);

    const chartData = useMemo(() => {
        if (!interactiveData) return [];

        let func, domain;


        
        if (interactiveData.funcId && funcMap[interactiveData.funcId]) {

            func = funcMap[interactiveData.funcId];
            
        } else if (interactiveData.graph?.funcId && funcMap[interactiveData.graph.funcId]) {
            func = funcMap[interactiveData.graph.funcId];
        }

        domain = interactiveData.domain || interactiveData.graph?.domain;

        if (func && domain) {
            return generateFunctionData(func, domain, 0.1);
        }
        return [];
    }, [step, interactiveData]);


    const activeConfig = useMemo(() => {
        if (!interactiveData) return null;
        const config = { ...interactiveData };

        if (config.funcId && funcMap[config.funcId]) {
            config.func = funcMap[config.funcId];
        }


        if (config.graph?.funcId && funcMap[config.graph.funcId]) {
            config.graph.func = funcMap[config.graph.funcId];
        }
        return config;
    }, [interactiveData]);


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
        <main className="bg-slate-100 min-h-[calc(100vh-65px)] flex items-center justify-center p-4 font-sans relative">

            {streak !== null && (
                <div className="absolute top-4 right-4 bg-white px-4 py-2 rounded-full shadow-md font-bold
                 text-orange-500 flex items-center gap-2">
                    🔥 {streak} Day Streak
                </div>
            )}

            <div className="bg-white w-full max-w-4xl rounded-2xl
             shadow-xl p-6 sm:p-8 md:p-10">

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
                            stepData={{ ...currentStepData, interactive: activeConfig }}
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

export default LessonTemplate;
