import { z } from 'zod';
import { requireUser } from '@/lib/session';
import { updateReminderPreference } from '@/lib/db/userService';

const bodySchema = z.object({
  reminderEmails: z.boolean(),
});

export async function PUT(request) {
  const user = await requireUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  await updateReminderPreference(user.id, parsed.data.reminderEmails);
  return Response.json({ success: true, reminderEmails: parsed.data.reminderEmails });
}
