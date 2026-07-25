import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { getStreak } from '@/lib/db/activityService';
import { pickReminders, reminderBody } from '@/lib/reminders';

function daysAgoUTC(date) {
  const day = (d) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((day(new Date()) - day(date)) / 86400000);
}

export async function POST(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET is not configured' }, { status: 503 });
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { emailVerified: true, reminderEmails: true, banned: false },
    select: { id: true, email: true, name: true, emailVerified: true, reminderEmails: true },
  });

  const candidates = [];
  for (const u of users) {
    const [lastActivity, streak] = await Promise.all([
      prisma.userDailyActivity.findFirst({
        where: { userId: u.id },
        orderBy: { activityDate: 'desc' },
        select: { activityDate: true },
      }),
      getStreak(u.id),
    ]);
    candidates.push({
      ...u,
      streak,
      lastActiveDaysAgo: lastActivity ? daysAgoUTC(lastActivity.activityDate) : null,
    });
  }

  const reminders = pickReminders(candidates);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const byId = new Map(users.map((u) => [u.id, u]));

  let sent = 0;
  const failed = [];
  for (const r of reminders) {
    const firstName = (byId.get(r.userId)?.name || 'there').split(' ')[0];
    try {
      await sendEmail({
        to: r.email,
        subject: r.subject,
        html: reminderBody(r, firstName, appUrl),
      });
      sent++;
    } catch {
      failed.push(r.userId);
    }
  }

  return Response.json({ considered: candidates.length, matched: reminders.length, sent, failed });
}
