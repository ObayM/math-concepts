'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getFullSession, isAdmin, isSuperAdmin } from '@/lib/authz';
import { ROLES } from '@/lib/permissions';
import { countUsersWithRole } from '@/lib/db/userService';

const CODED_IN_IDS = (process.env.ADMIN_USER_IDS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

async function requireActor() {
  const session = await getFullSession();
  return session?.user ?? null;
}

export async function setRoleAction(formData) {
  const actor = await requireActor();
  if (!isSuperAdmin(actor)) throw new Error('Forbidden');

  const userId = formData.get('userId')?.toString();
  const role = formData.get('role')?.toString();
  if (!userId || !role) throw new Error('userId and role are required');
  if (userId === actor.id) throw new Error("You can't change your own role");

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (target?.role === ROLES.SUPER_ADMIN && role !== ROLES.SUPER_ADMIN) {
    const superAdmins = await countUsersWithRole(ROLES.SUPER_ADMIN);
    if (superAdmins <= 1) throw new Error("Can't demote the last super_admin");
  }

  await auth.api.setRole({ headers: await headers(), body: { userId, role } });
  revalidatePath('/admin/users');
}

export async function banUserAction(formData) {
  const actor = await requireActor();
  if (!isSuperAdmin(actor)) throw new Error('Forbidden');

  const userId = formData.get('userId')?.toString();
  const banReason = formData.get('banReason')?.toString() || undefined;
  if (!userId) throw new Error('userId is required');
  if (userId === actor.id) throw new Error("You can't ban yourself");
  if (CODED_IN_IDS.includes(userId)) throw new Error("Can't ban a coded-in super admin");

  await auth.api.banUser({ headers: await headers(), body: { userId, banReason } });
  revalidatePath('/admin/users');
}

export async function unbanUserAction(formData) {
  const actor = await requireActor();
  if (!isSuperAdmin(actor)) throw new Error('Forbidden');

  const userId = formData.get('userId')?.toString();
  if (!userId) throw new Error('userId is required');

  await auth.api.unbanUser({ headers: await headers(), body: { userId } });
  revalidatePath('/admin/users');
}

export async function impersonateUserAction(formData) {
  const actor = await requireActor();
  if (!isAdmin(actor)) throw new Error('Forbidden');

  const userId = formData.get('userId')?.toString();
  if (!userId) throw new Error('userId is required');
  if (userId === actor.id) throw new Error("You can't impersonate yourself");

  await auth.api.impersonateUser({ headers: await headers(), body: { userId } });
  redirect('/dashboard');
}
