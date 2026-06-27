import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.userDailyActivity.upsert({
    where: {
      userId_activityDate: {
        userId: session.user.id,
        activityDate: today,
      },
    },
    update: {},
    create: {
      userId: session.user.id,
      activityDate: today,
    },
  });

  return NextResponse.json({ success: true });
}
