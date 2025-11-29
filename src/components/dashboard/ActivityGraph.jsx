'use client';
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const ActivityGraph = ({ activityData }) => {

    const days = useMemo(() => {
        const today = new Date();
        const dates = [];
        for (let i = 364; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            dates.push(d.toISOString().split('T')[0]);
        }
        return dates;
    }, []);


    const activityMap = useMemo(() => {
        const map = {};
        if (activityData) {
            activityData.forEach(item => {
                map[item.date] = item.count;
            });
        }
        return map;
    }, [activityData]);

    const getColor = (count) => {
        if (!count) return 'bg-slate-100';
        if (count === 1) return 'bg-green-200';
        if (count === 2) return 'bg-green-300';
        if (count === 3) return 'bg-green-400';
        return 'bg-green-500';
    };

    return (
        <div className="w-full overflow-x-auto pb-2">
            <div className="flex gap-1 min-w-max">

                <div className="grid grid-rows-7 grid-flow-col gap-1">
                    {days.map(date => {
                        const count = activityMap[date] || 0;
                        return (
                            <motion.div
                                key={date}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className={`w-3 h-3 rounded-sm ${getColor(count)}`}
                                title={`${date}: ${count} activities`}
                            />
                        );
                    })}
                </div>
            </div>


            <div className="flex items-center justify-end gap-2 mt-2 text-xs text-slate-400">
                <span>Less</span>
                <div className="w-3 h-3 rounded-sm bg-slate-100" />
                <div className="w-3 h-3 rounded-sm bg-green-200" />
                <div className="w-3 h-3 rounded-sm bg-green-400" />
                <div className="w-3 h-3 rounded-sm bg-green-500" />
                <span>More</span>
            </div>
        </div>
    );
};

export default ActivityGraph;

