'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, ReferenceDot } from 'recharts';


const evaluateMath = (expr, context) => {
  if (!expr) return 0;
  try {

    let cleanExpr = expr
      .replace(/\^/g, '**')
      .replace(/sin/g, 'Math.sin')
      .replace(/cos/g, 'Math.cos')
      .replace(/tan/g, 'Math.tan')
      .replace(/abs/g, 'Math.abs')
      .replace(/sqrt/g, 'Math.sqrt')
      .replace(/cbrt/g, 'Math.cbrt')
      .replace(/log2/g, 'Math.log2')
      .replace(/log10/g, 'Math.log10')
      .replace(/log/g, 'Math.log')
      .replace(/exp/g, 'Math.exp')
      .replace(/floor/g, 'Math.floor')
      .replace(/ceil/g, 'Math.ceil')
      .replace(/round/g, 'Math.round')
      .replace(/min/g, 'Math.min')
      .replace(/max/g, 'Math.max')
      .replace(/PI/g, 'Math.PI')
      .replace(/e/g, 'Math.E');

      const keys = Object.keys(context);
    const values = Object.values(context);
    const func = new Function(...keys, `return ${cleanExpr};`);
    return func(...values);
  } catch (err) {
    console.warn(`Error : ${expr}`, err);
    return 0;
  }
};

export const FunctionVisualizer = ({ config, interactiveValue }) => {
  const [chartData, setChartData] = useState([]);

  const t = useMemo(() => {
    const [min, max] = config.paramRange;
    const normalized = interactiveValue / 100;
    return min + (normalized * (max - min));
  }, [config.paramRange, interactiveValue]);


  useEffect(() => {
    const points = [];
    const [xMin, xMax] = config.xDomain;
    const step = (xMax - xMin) / 150;

    const functionElements = config.elements.filter(e => e.type === 'function');

    for (let x = xMin; x <= xMax + step/2; x += step) {
      const point = { x };
      
      functionElements.forEach(el => {
        if (el.expression) {

          const val = evaluateMath(el.expression, { x, t });

          point[el.id] = isNaN(val) ? undefined : val; 
        }
      });
      points.push(point);
    }
    setChartData(points);
  }, [config, t]);



  const renderDynamicElements = () => {
    return config.elements.map((el, idx) => {
      const key = `${el.id}-${idx}`;

      switch (el.type) {
        case 'function':

        return null;

        case 'point': {
          const px = evaluateMath(el.x || '0', { t });
          const py = evaluateMath(el.y || '0', { t });
          if (isNaN(px) || isNaN(py)) return null;
          
          return (
            <ReferenceDot
              key={key}
              x={px}
              y={py}
              r={el.r || 6}
              fill={el.color}
              stroke="white"
              strokeWidth={3}
              label={el.label ? { value: el.label, position: 'top', fill: el.color, fontSize: 13, fontWeight: '800' } : undefined}
            />
          );
        }

        case 'line': {
          const x1 = evaluateMath(el.x1 || '0', { t });
          const y1 = evaluateMath(el.y1 || '0', { t });
          const x2 = evaluateMath(el.x2 || '0', { t });
          const y2 = evaluateMath(el.y2 || '0', { t });
          if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) return null;

          return (
            <ReferenceLine
              key={key}
              segment={[{ x: x1, y: y1 }, { x: x2, y: y2 }]}
              stroke={el.color}
              strokeDasharray={el.style === 'dashed' ? "6 6" : el.style === 'dotted' ? "3 3" : undefined}
              strokeWidth={el.strokeWidth || 2}
            />
          );
        }

        case 'v-line': {
          const vx = evaluateMath(el.x || '0', { t });
          if (isNaN(vx)) return null;
          return (
            <ReferenceLine
              key={key}
              x={vx}
              stroke={el.color}
              strokeDasharray={el.style === 'dashed' ? "6 6" : undefined}
              strokeWidth={el.strokeWidth || 2}
              label={el.label ? { value: el.label, fill: el.color, fontSize: 12, position: 'insideTopRight' } : undefined}
            />
          );
        }

        case 'h-line': {
          const hy = evaluateMath(el.y || '0', { t });
          if (isNaN(hy)) return null;
          return (
            <ReferenceLine
              key={key}
              y={hy}
              stroke={el.color}
              strokeDasharray={el.style === 'dashed' ? "6 6" : undefined}
              strokeWidth={el.strokeWidth || 2}
              label={el.label ? { value: el.label, fill: el.color, fontSize: 12, position: 'insideTopRight' } : undefined}
            />
          );
        }
        
        default:
          return null;
      }
    });
  };

  return (
    <div className="h-72 w-full bg-white rounded-4xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.05)] 
    p-4 border border-slate-100 relative overflow-hidden group">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis 
            dataKey="x" 
            type="number" 
            domain={config.xDomain} 
            hide 
            allowDataOverflow 
          />
          <YAxis 
            domain={config.yDomain} 
            hide 
            allowDataOverflow 
          />
          

          <ReferenceLine x={0} stroke="#cbd5e1" strokeWidth={2} />
          <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={2} />


          {config.elements.filter(e => e.type === 'function').map((func) => (
             <Line 
               key={func.id}
               type={func.id.includes('step') ? "step" : "monotone"}
               dataKey={func.id} 
               stroke={func.color} 
               strokeWidth={func.strokeWidth || 4} 
               dot={false} 
               isAnimationActive={false} 
               connectNulls={false}
               strokeDasharray={func.style === 'dashed' ? "5 5" : undefined}
             />
          ))}

          {renderDynamicElements()}

        </LineChart>
      </ResponsiveContainer>
      
      <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-sm border border-slate-200/60 pointer-events-none transition-opacity duration-300">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
            {config.paramLabel?.split(' ')[1] || 'Parameter'}
        </div>
        <div className="font-mono text-slate-700 font-bold text-base">
            {t.toFixed(1)}
        </div>
      </div>
    </div>
  );
};
