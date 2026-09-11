import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { isValidLevel, levelById } from '@/lib/warmup/questions';
import WarmupRunner from '@/components/warmup/WarmupRunner';
import { getT } from '@/lib/i18n/server';
import { levelName, levelBlurb } from '@/lib/warmup/level-copy';

function resolveLevel(raw) {
  const level = Number(raw);
  return isValidLevel(level) ? levelById(level) : null;
}

export async function generateMetadata({ params }) {
  const { level } = await params;
  const found = resolveLevel(level);
  return { title: found ? `${found.name} · Warm up` : 'Warm up' };
}

export default async function WarmupLevelPage({ params }) {
  const user = await requireUser();
  if (!user) redirect('/login');

  const { level } = await params;
  const found = resolveLevel(level);
  if (!found) notFound();

  const t = await getT();
  return (
    <WarmupRunner
      level={found.id}
      levelName={levelName(t, found.id, found.name)}
      levelBlurb={levelBlurb(t, found.id, found.blurb)}
    />
  );
}
