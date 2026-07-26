import { z } from 'zod';
import { requireUser } from '@/lib/session';
import { consume, tooManyRequests } from '@/lib/rate-limit';
import { updateUserProfile } from '@/lib/db/userService';

const IMAGE_SCHEME = /^(https?:\/\/|data:image\/)/i;

const bodySchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  image: z.string().max(2048).nullable().optional(),
});

export async function PUT(request) {
  const user = await requireUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = await consume(user.id, 'profile');
  if (!limit.ok) return tooManyRequests(limit.retryAfterMs);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { name, image } = parsed.data;

  if (typeof image === 'string' && image !== '' && !IMAGE_SCHEME.test(image)) {
    return Response.json(
      { error: 'Image URL must be http(s) or a data:image URI' },
      { status: 400 }
    );
  }

  await updateUserProfile(user.id, {
    ...(name !== undefined && { name }),
    ...(image !== undefined && { image: image || null }),
  });

  return Response.json({ ok: true });
}
