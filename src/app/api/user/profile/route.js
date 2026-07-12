import { requireUser } from '@/lib/session';
import { updateUserProfile } from '@/lib/db/userService';

export async function PUT(request) {
  const user = await requireUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, image } = body;

  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    return Response.json({ error: 'Name cannot be empty' }, { status: 400 });
  }
  if (image !== undefined && image !== null && typeof image !== 'string') {
    return Response.json({ error: 'Invalid image URL' }, { status: 400 });
  }

  await updateUserProfile(user.id, {
    ...(name !== undefined && { name: name.trim() }),
    ...(image !== undefined && { image: image || null }),
  });

  return Response.json({ ok: true });
}
