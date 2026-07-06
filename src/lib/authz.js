import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { ROLES, ADMIN_ROLES } from '@/lib/permissions';

const adminUserIds = (process.env.ADMIN_USER_IDS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export async function getFullSession() {
  return auth.api.getSession({ headers: await headers() });
}

function roleList(user) {
  return String(user?.role ?? '')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);
}

export function isSuperAdmin(user) {
  return !!user && (adminUserIds.includes(user.id) || roleList(user).includes(ROLES.SUPER_ADMIN));
}

export function isAdmin(user) {
  return (
    !!user &&
    (adminUserIds.includes(user.id) || roleList(user).some((r) => ADMIN_ROLES.includes(r)))
  );
}

export async function requireAdmin() {
  const session = await getFullSession();
  const user = session?.user ?? null;
  if (!isAdmin(user)) redirect('/dashboard');
  return user;
}

export async function requireSuperAdmin() {
  const session = await getFullSession();
  const user = session?.user ?? null;
  if (!isSuperAdmin(user)) redirect('/dashboard');
  return user;
}

export async function assertPermission(permissions) {
  const session = await getFullSession();
  const user = session?.user ?? null;
  if (!user) return { ok: false, status: 401, user: null };
  if (adminUserIds.includes(user.id)) return { ok: true, user };
  const result = await auth.api.userHasPermission({ body: { userId: user.id, permissions } });
  if (!result?.success) return { ok: false, status: 403, user };
  return { ok: true, user };
}
