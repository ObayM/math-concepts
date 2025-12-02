'use client';
import { useEffect, useState } from "react";

import { FunctionVisualizer } from "@/components/visualizations";
import { FiPlus, FiTrash2, FiPlay, FiPause, FiRefreshCw } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";


const defaultElements = [
    {
        id: 'func-1',
        type: 'function',
        experession: 'sin(x) * cos(t)',
        color: '#3b82f6',
        strokeWidth: 3
    },
    {
        id: 'func-2',
        type: 'function',
        experession: 'x^2 / 10',
        color: '#ef4444',
        strokeWidth: 3,
        style: 'dashed'
    }

]


export default function Sandbox() {
    const [elements, setElements] = useState(defaultElements);
    const [interactiveValue, setInteractiveValue] = useState(50);

    const [isPlaying, setIsPlaying] = useState(false);
    const [config, setConfig] = useState({
        xDomain: [-10, 10],
        yDomain: [-10, 10],
        paramRange: [0, 10],
        paramLabel: 'Time t'
    })

    useEffect(() => {
        let interval;

        if (isPlaying){
            interval = setInterval(() => {

                setInteractiveValue(prev => (prev + 1) % 100);
            }, 50);
        }

        return () => clearInterval(interval);
    }, [isPlaying])

   
    const addElement = () => {
        const newId = `el-${Date.now()}`;
        setElements([
            ...elements,
            {
                id: newId,
                type: 'function',
                expression: 'x',
                color: '#10b981',
                strokeWidth: 3
            }
        ]);
    };

    const updateElement = (id, field, value) => {
        setElements(elements.map(el =>
            el.id === id ? { ...el, [field]: value } : el
        ));
    };

    const removeElement = (id) => {
        setElements(elements.filter(el => el.id !== id));
    };

    const fullConfig = {
        ...config,
        elements
    };

    return (
        <div className="min-h-[calc(100vh-73px) bg-slate-50 flex flex-col lg:flex-row">

            <div className="w-full lg:w-96 bg-white border-r border-slate-200 p-6 flex 
            flex-col h-auto lg:h-[calc(100vh-73px)] overflow-y-auto shadow-sm z-10">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                         Sandbox
                    </h1>
                    <button
                        onClick={() => setElements(defaultElements)}
                        className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                        title="Reset to defaults"
                    >
                        <FiRefreshCw />
                    </button>
                </div>

            </div>    
             <div className="mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-bold text-slate-700">Parameter (t)</label>
                <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`p-2 rounded-lg transition-all ${isPlaying ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}
                >
                    {isPlaying ? <FiPause /> : <FiPlay />}
                </button>
            </div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={interactiveValue}
                    onChange={(e) => setInteractiveValue(Number(e.target.value))}
                    className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono">
                    <span>0</span>
                    <span>{interactiveValue}</span>
                    <span>100</span>
                </div>



                <div className="space-y-4 grow">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Elements</h2>
                        <button
                            onClick={addElement}
                            className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
                        >
                            <FiPlus /> Add New
                        </button>
                    </div>

                    <AnimatePresence>
                        {elements.map((el) => (
                            <motion.div
                                key={el.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm group hover:border-blue-300 transition-all"
                            >
                                <div className="flex items-start gap-3">
                                    <div
                                        className="w-3 h-full self-stretch rounded-full shrink-0"
                                        style={{ backgroundColor: el.color }}
                                    />
                                    <div className="grow space-y-3">
                                        <div className="flex items-center justify-between">
                                            <select
                                                value={el.type}
                                                onChange={(e) => updateElement(el.id, 'type', e.target.value)}
                                                className="text-xs font-bold text-slate-600 bg-slate-100 rounded-md px-2 py-1 border-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="function">Function y=f(x)</option>
                                                <option value="parametric">Parametric</option>
                                                <option value="point">Point</option>
                                            </select>
                                            <button
                                                onClick={() => removeElement(el.id)}
                                                className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                            >
                                                <FiTrash2 size={14} />
                                            </button>
                                        </div>

                                        {el.type === 'function' && (
                                            <input
                                                type="text"
                                                value={el.expression}
                                                onChange={(e) => updateElement(el.id, 'expression', e.target.value)}
                                                className="w-full font-mono text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                                placeholder="e.g. sin(x)"
                                            />
                                        )}



                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={el.color}
                                                onChange={(e) => updateElement(el.id, 'color', e.target.value)}
                                                className="w-6 h-6 rounded cursor-pointer border-none p-0"
                                            />
                                            <span className="text-xs text-slate-400 font-mono">{el.color}</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            <div className="grow p-4 lg:p-8 flex flex-col">
                <div className="grow bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden relative">
                    <div className="absolute inset-0">

                        <div className="w-full h-full flex flex-col">

                            <FunctionVisualizer
                                config={fullConfig}
                                interactiveValue={interactiveValue}
                                className="w-full h-full"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-4 text-center text-slate-400 text-sm">
                    Use <b>t</b> in your expressions to make them dynamic! Example: <code>sin(x + t)</code>
                </div>
            </div>
        </div>
    );
}


