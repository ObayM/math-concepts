import { z } from 'zod';
import { requireUser } from '@/lib/session';
import { consume, tooManyRequests } from '@/lib/rate-limit';
import { updateReminderPreference } from '@/lib/db/userService';

const bodySchema = z.object({
  reminderEmails: z.boolean(),
});

export async function PUT(request) {
  const user = await requireUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = await consume(user.id, 'settings');
  if (!limit.ok) return tooManyRequests(limit.retryAfterMs);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  await updateReminderPreference(user.id, parsed.data.reminderEmails);
  return Response.json({ success: true, reminderEmails: parsed.data.reminderEmails });
}
