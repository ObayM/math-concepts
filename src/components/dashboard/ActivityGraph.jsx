'use client';
import React, { useMemo, useState } from 'react';
import { Zap, Calendar } from 'lucide-react';

const DAY_LABELS = ['S', 'Su', 'M', 'T', 'W', 'Th', 'F'];

const ActivityGraph = ({ activityData }) => {
  const [view, setView] = useState('week');

  const activityMap = useMemo(() => {
    const map = {};
    if (activityData) {
      activityData.forEach((item) => {
        map[item.date] = item.count;
      });
    }
    return map;
  }, [activityData]);

  const weekDays = useMemo(() => {
    const today = new Date();
    const dow = today.getDay();
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - dow + i);
      days.push({
        date: d.toISOString().split('T')[0],
        label: DAY_LABELS[d.getDay()],
        isToday: d.toDateString() === today.toDateString(),
      });
    }
    return days;
  }, []);

  const monthDays = useMemo(() => {
    const today = new Date();
    const days = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  }, []);

  const activeDays = weekDays.filter((d) => (activityMap[d.date] || 0) > 0).length;
  const target = 3;
  const remaining = Math.max(0, target - activeDays);

  return (
    <div className="w-full">
      {view === 'week' ? (
        <StreakView weekDays={weekDays} activityMap={activityMap} remaining={remaining} />
      ) : (
        <GridView monthDays={monthDays} activityMap={activityMap} />
      )}

      <div className="flex justify-end mt-2">
        <button
          onClick={() => setView(view === 'week' ? 'month' : 'week')}
          className="p-1 rounded-lg text-neutral-300/60 hover:text-neutral-400 transition-colors cursor-pointer"
          title={view === 'week' ? 'Monthly' : 'Weekly'}
          aria-label="Toggle view"
        >
          <Calendar className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

const StreakView = ({ weekDays, activityMap, remaining }) => (
  <div>
    <p className="text-center text-sm text-neutral-500 mb-6">
      {remaining > 0 ? (
        <>
          Solve{' '}
          <span className="font-bold text-neutral-800">
            {remaining} problem{remaining !== 1 ? 's' : ''}
          </span>{' '}
          to start a streak
        </>
      ) : (
        <>7 days straight. Keep it going.</>
      )}
    </p>

    <div className="flex items-center justify-center gap-3 sm:gap-5">
      {weekDays.map((day) => {
        const count = activityMap[day.date] || 0;
        const active = count > 0;

        return (
          <div key={day.date} className="flex flex-col items-center gap-2">
            <div
              className={[
                'w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-colors duration-200',
                active
                  ? 'bg-neutral-800 text-white'
                  : day.isToday
                    ? 'ring-2 ring-neutral-200 bg-white text-neutral-400'
                    : 'bg-neutral-100 text-neutral-300',
              ].join(' ')}
            >
              <Zap className={`w-4 h-4 sm:w-[18px] sm:h-[18px] ${active ? 'fill-white' : ''}`} />
            </div>
            <span
              className={`text-xs font-medium ${day.isToday ? 'text-neutral-700' : 'text-neutral-400'}`}
            >
              {day.label}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

const GridView = ({ monthDays, activityMap }) => {
  const color = (count) => {
    if (!count) return 'bg-neutral-100';
    if (count <= 1) return 'bg-neutral-300';
    if (count <= 2) return 'bg-neutral-500';
    return 'bg-neutral-700';
  };

  return (
    <div>
      <p className="text-xs text-neutral-400 mb-3">Last 4 weeks</p>
      <div className="grid grid-cols-7 gap-1.5">
        {monthDays.map((date) => (
          <div
            key={date}
            className={`w-full aspect-square rounded-lg ${color(activityMap[date] || 0)} transition-colors`}
            title={`${date}: ${activityMap[date] || 0}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-end gap-1.5 mt-3 text-xs text-neutral-400">
        <span>Less</span>
        <div className="w-2.5 h-2.5 rounded bg-neutral-100" />
        <div className="w-2.5 h-2.5 rounded bg-neutral-300" />
        <div className="w-2.5 h-2.5 rounded bg-neutral-500" />
        <div className="w-2.5 h-2.5 rounded bg-neutral-700" />
        <span>More</span>
      </div>
    </div>
  );
};

export default ActivityGraph;
