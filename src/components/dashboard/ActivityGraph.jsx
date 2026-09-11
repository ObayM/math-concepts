'use client';
import React, { useMemo, useState } from 'react';
import { Zap, Calendar } from 'lucide-react';
import { useT, useLocale } from '@/components/i18n/LocaleProvider';

const dayKey = (d) => d.toISOString().slice(0, 10);

function localToday(timezone) {
  // en-CA is the YYYY-MM-DD serializer, not a display locale. see src/lib/timezone.ts
  const key = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || undefined,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return new Date(`${key}T00:00:00.000Z`);
}

const ActivityGraph = ({
  activityData,
  streak,
  hasActivityToday,
  showCaption = true,
  timezone,
}) => {
  const t = useT();
  const locale = useLocale();
  const dayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2024, 0, 7 + i))));
  }, [locale]);
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
    const base = localToday(timezone);
    const todayKey = dayKey(base);
    const dow = base.getUTCDay();
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setUTCDate(d.getUTCDate() - dow + i);
      days.push({
        date: dayKey(d),
        label: dayLabels[d.getUTCDay()],
        isToday: dayKey(d) === todayKey,
      });
    }
    return days;
  }, [timezone, dayLabels]);

  const monthDays = useMemo(() => {
    const base = localToday(timezone);
    const days = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date(base);
      d.setUTCDate(d.getUTCDate() - i);
      days.push(dayKey(d));
    }
    return days;
  }, [timezone]);

  return (
    <div className="w-full">
      {view === 'week' ? (
        <StreakView
          weekDays={weekDays}
          activityMap={activityMap}
          streak={streak ?? 0}
          hasActivityToday={hasActivityToday}
          showCaption={showCaption}
        />
      ) : (
        <GridView monthDays={monthDays} activityMap={activityMap} />
      )}

      <div className="flex justify-end mt-2">
        <button
          onClick={() => setView(view === 'week' ? 'month' : 'week')}
          className="tap-target flex items-center justify-center p-1 rounded-lg text-neutral-300/60 hover:text-neutral-400 transition-colors cursor-pointer"
          title={view === 'week' ? t('activity.monthly') : t('activity.weekly')}
          aria-label={t('activity.toggle')}
        >
          <Calendar className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

const StreakView = ({ weekDays, activityMap, streak, hasActivityToday, showCaption }) => {
  const t = useT();
  return (
    <div>
      {showCaption && (
        <p className="text-center text-sm text-neutral-500 mb-6">
          {streak === 0 ? (
            <>{t('activity.startStreak')}</>
          ) : hasActivityToday ? (
            <>
              <span className="font-bold text-neutral-800">
                {streak} day{streak !== 1 ? 's' : ''}
              </span>{' '}
              strong. Keep it going.
            </>
          ) : (
            <>{t('activity.keepAlive')}</>
          )}
        </p>
      )}

      <div className="flex items-end justify-between">
        {weekDays.map((day) => {
          const count = activityMap[day.date] || 0;
          const active = count > 0;

          return (
            <div key={day.date} className="flex flex-col items-center gap-2">
              <div
                className={[
                  'w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200',
                  active
                    ? 'bg-success-500 text-white'
                    : day.isToday
                      ? 'ring-2 ring-primary-300 bg-white text-primary-500'
                      : 'bg-neutral-100 text-neutral-300',
                ].join(' ')}
              >
                <Zap className={`w-4 h-4 ${active ? 'fill-white' : ''}`} />
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
};

const GridView = ({ monthDays, activityMap }) => {
  const t = useT();
  const color = (count) => {
    if (!count) return 'bg-neutral-100';
    if (count <= 1) return 'bg-neutral-300';
    if (count <= 2) return 'bg-neutral-500';
    return 'bg-neutral-700';
  };

  return (
    <div>
      <p className="text-xs text-neutral-400 mb-3">{t('activity.lastFourWeeks')}</p>
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
        <span>{t('activity.less')}</span>
        <div className="w-2.5 h-2.5 rounded bg-neutral-100" />
        <div className="w-2.5 h-2.5 rounded bg-neutral-300" />
        <div className="w-2.5 h-2.5 rounded bg-neutral-500" />
        <div className="w-2.5 h-2.5 rounded bg-neutral-700" />
        <span>{t('activity.more')}</span>
      </div>
    </div>
  );
};

export default ActivityGraph;
