import { z } from 'zod';
import { requireUser } from '@/lib/session';
import { consume, tooManyRequests } from '@/lib/rate-limit';
import { updateLocale, updateReminderPreference } from '@/lib/db/userService';
import { LOCALES } from '@/lib/locale';

const bodySchema = z.object({
  reminderEmails: z.boolean().optional(),
  locale: z.enum(LOCALES).optional(),
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

  const { reminderEmails, locale } = parsed.data;
  if (reminderEmails !== undefined) await updateReminderPreference(user.id, reminderEmails);
  if (locale !== undefined) await updateLocale(user.id, locale);

  const res = Response.json({ success: true, reminderEmails, locale });
  // the apex reads this cookie instead of guessing again, and it has to be
  // visible on the sibling subdomain, so the server owns it rather than the client
  if (locale !== undefined) {
    const domain = (process.env.COOKIE_DOMAIN ?? '').trim();
    res.headers.append(
      'set-cookie',
      `mathly-lang=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${domain ? `; Domain=${domain}` : ''}`
    );
  }
  return res;
}
