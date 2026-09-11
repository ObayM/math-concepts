import { timingSafeEqual, createHash } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { getStreak } from '@/lib/db/activityService';
import { pickReminders, REMINDER_HOUR } from '@/lib/reminders';
import { localeOf, reminderEmail } from '@/lib/email-templates';
import { originForLocale } from '@/lib/origin';
import { firstName } from '@/lib/user-name';

import { dayKeyOf, daysBetween, localDayKey, localHour } from '@/lib/timezone';

function bearerMatches(given, expected) {
  const digest = (value) =>
    createHash('sha256')
      .update(String(value ?? ''))
      .digest();
  return timingSafeEqual(digest(given), digest(expected));
}

export async function POST(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET is not configured' }, { status: 503 });
  }
  if (!bearerMatches(request.headers.get('authorization'), `Bearer ${secret}`)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { emailVerified: true, reminderEmails: true, banned: false },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      reminderEmails: true,
      lastRemindedAt: true,
      timezone: true,
      locale: true,
    },
  });

  const now = new Date();
  // only the users whose own evening it is right now, so the per-user work
  // below stays proportional to who could actually be mailed this hour
  const dueNow = users.filter((u) => localHour(u.timezone, now) === REMINDER_HOUR);

  const candidates = [];
  for (const u of dueNow) {
    const [lastActivity, streak] = await Promise.all([
      prisma.userDailyActivity.findFirst({
        where: { userId: u.id },
        orderBy: { activityDate: 'desc' },
        select: { activityDate: true },
      }),
      getStreak(u.id, u.timezone),
    ]);
    candidates.push({
      ...u,
      streak,
      localHour: REMINDER_HOUR,
      now,
      lastActiveDaysAgo: lastActivity
        ? daysBetween(dayKeyOf(lastActivity.activityDate), localDayKey(u.timezone, now))
        : null,
    });
  }

  const reminders = pickReminders(candidates);
  const byId = new Map(users.map((u) => [u.id, u]));

  let sent = 0;
  const failed = [];
  for (const r of reminders) {
    const row = byId.get(r.userId);
    const locale = localeOf(row?.locale);
    const { subject, html } = reminderEmail(
      locale,
      r.reason,
      firstName(row),
      originForLocale(locale)
    );
    try {
      await sendEmail({ to: r.email, subject, html });
      await prisma.user.update({ where: { id: r.userId }, data: { lastRemindedAt: now } });
      sent++;
    } catch {
      failed.push(r.userId);
    }
  }

  return Response.json({
    considered: candidates.length,
    dueThisHour: dueNow.length,
    matched: reminders.length,
    sent,
    failed,
  });
}
