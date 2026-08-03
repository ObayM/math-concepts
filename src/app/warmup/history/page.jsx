import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { getUserTimeZone } from '@/lib/db/userService';
import {
  getWarmupTotals,
  getWarmupWeakSpots,
  getWarmupSpeedTrend,
  listWarmupSessions,
} from '@/lib/db/warmupService';
import { isValidLevel } from '@/lib/warmup/questions';
import { LEVELS } from '@/lib/warmup/levels';
import { normalizeTimeZone } from '@/lib/timezone';
import HistoryView from '@/components/warmup/HistoryView';

export const metadata = {
  title: 'Warm up history',
  description: 'Your drill sessions, your pace over time and the facts still slowing you down.',
};

export default async function WarmupHistoryPage({ searchParams }) {
  const user = await requireUser();
  if (!user) redirect('/login');

  const { level: rawLevel } = await searchParams;
  const asked = Number(rawLevel);
  const level = isValidLevel(asked) ? asked : null;

  const timezone = normalizeTimeZone(await getUserTimeZone(user.id));
  const [totals, trend, weakSpots, history] = await Promise.all([
    getWarmupTotals(user.id),
    getWarmupSpeedTrend(user.id, { level, limit: 24 }),
    getWarmupWeakSpots(user.id, { level, days: 30, limit: 8 }),
    listWarmupSessions(user.id, { level, limit: 40 }),
  ]);

  const label = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const withLabel = (session) => ({ ...session, label: label.format(session.startedAt) });

  return (
    <HistoryView
      level={level}
      levels={LEVELS.map((l) => ({ id: l.id, name: l.name }))}
      totals={totals}
      trend={trend.map(withLabel)}
      weakSpots={weakSpots}
      sessions={history.sessions.map(withLabel)}
    />
  );
}
