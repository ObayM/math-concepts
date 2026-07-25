export interface ReminderCandidate {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  reminderEmails: boolean;
  streak: number;
  lastActiveDaysAgo: number | null;
}

export interface Reminder {
  userId: string;
  email: string;
  subject: string;
  reason: 'streak-at-risk' | 'come-back';
}

export function isEligible(u: ReminderCandidate): boolean {
  return u.emailVerified && u.reminderEmails && u.lastActiveDaysAgo !== null;
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

export function reminderBody(r: Reminder, firstName: string, appUrl: string): string {
  const settings = `${appUrl}/settings`;
  const lead =
    r.reason === 'streak-at-risk'
      ? `Hey ${firstName}, you didn't practise today and your streak is about to reset. One lesson keeps it alive.`
      : `Hey ${firstName}, it's been a few days. Your progress is exactly where you left it.`;

  return `<p>${lead}</p>
<p><a href="${appUrl}/dashboard">Open Mathly</a></p>
<p style="color:#888;font-size:12px">Don't want these? <a href="${settings}">Turn reminders off</a>.</p>`;
}
