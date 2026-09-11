// a reminder should land in the evening where the reader actually is, so the
// cron runs hourly and each user only qualifies during their own local hour
export const REMINDER_HOUR = 19;
const RESEND_GUARD_MS = 20 * 60 * 60 * 1000;

export interface ReminderCandidate {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  reminderEmails: boolean;
  streak: number;
  lastActiveDaysAgo: number | null;
  localHour: number;
  lastRemindedAt?: Date | null;
  now?: Date;
}

export interface Reminder {
  userId: string;
  email: string;
  subject: string;
  reason: 'streak-at-risk' | 'come-back';
}

export function isEvening(u: ReminderCandidate): boolean {
  return u.localHour === REMINDER_HOUR;
}

export function alreadyRemindedToday(u: ReminderCandidate): boolean {
  if (!u.lastRemindedAt) return false;
  const now = u.now ?? new Date();
  return now.getTime() - u.lastRemindedAt.getTime() < RESEND_GUARD_MS;
}

export function isEligible(u: ReminderCandidate): boolean {
  return (
    u.emailVerified &&
    u.reminderEmails &&
    u.lastActiveDaysAgo !== null &&
    isEvening(u) &&
    !alreadyRemindedToday(u)
  );
}

export function reminderFor(u: ReminderCandidate): Reminder | null {
  if (!isEligible(u)) return null;
  const idle = u.lastActiveDaysAgo as number;

  if (u.streak > 0 && idle === 1) {
    return {
      userId: u.id,
      email: u.email,
      subject: `Your ${u.streak}-day streak runs out tonight`,
      reason: 'streak-at-risk',
    };
  }

  if (idle >= 3 && idle <= 14) {
    return {
      userId: u.id,
      email: u.email,
      subject: 'Pick up where you left off',
      reason: 'come-back',
    };
  }

  return null;
}

export function pickReminders(users: ReminderCandidate[]): Reminder[] {
  return users.map(reminderFor).filter((r): r is Reminder => r !== null);
}
