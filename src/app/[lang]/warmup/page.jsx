import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { getWarmupOverview, getWarmupTotals } from '@/lib/db/warmupService';
import LevelPicker from '@/components/warmup/LevelPicker';

export const metadata = {
  title: 'Warm up',
  description: 'Short mental math drills that build speed on the easy stuff.',
};

export default async function WarmupPage() {
  const user = await requireUser();
  if (!user) redirect('/login');

  const [overview, totals] = await Promise.all([
    getWarmupOverview(user.id),
    getWarmupTotals(user.id),
  ]);

  return <LevelPicker overview={overview} totals={totals} />;
}
