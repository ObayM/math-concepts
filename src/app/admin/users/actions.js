'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getFullSession, isSuperAdmin, isAdmin } from '@/lib/authz';
import { ROLES } from '@/lib/permissions';
import { countUsersWithRole } from '@/lib/db/userService';
import { AUDIT, recordAudit } from '@/lib/db/auditService';

const CODED_IN_IDS = (process.env.ADMIN_USER_IDS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const RANK = { student: 0, admin: 1, super_admin: 2 };

function rankOf(user) {
  if (!user) return -1;
  if (CODED_IN_IDS.includes(user.id)) return RANK.super_admin;
  return String(user.role ?? '')
    .split(',')
    .map((r) => r.trim())
    .reduce((max, r) => Math.max(max, RANK[r] ?? 0), 0);
}

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

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, email: true },
  });
  if (target?.role === ROLES.SUPER_ADMIN && role !== ROLES.SUPER_ADMIN) {
    const superAdmins = await countUsersWithRole(ROLES.SUPER_ADMIN);
    if (superAdmins <= 1) throw new Error("Can't demote the last super_admin");
  }

  await auth.api.setRole({ headers: await headers(), body: { userId, role } });
  await recordAudit({
    action: AUDIT.ROLE_SET,
    target: { type: 'user', id: userId, label: target?.email },
    meta: { from: target?.role ?? null, to: role },
  });
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

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  await auth.api.banUser({ headers: await headers(), body: { userId, banReason } });
  await recordAudit({
    action: AUDIT.USER_BANNED,
    target: { type: 'user', id: userId, label: target?.email },
    meta: { reason: banReason ?? null },
  });
  revalidatePath('/admin/users');
}

export async function unbanUserAction(formData) {
  const actor = await requireActor();
  if (!isSuperAdmin(actor)) throw new Error('Forbidden');

  const userId = formData.get('userId')?.toString();
  if (!userId) throw new Error('userId is required');

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  await auth.api.unbanUser({ headers: await headers(), body: { userId } });
  await recordAudit({
    action: AUDIT.USER_UNBANNED,
    target: { type: 'user', id: userId, label: target?.email },
  });
  revalidatePath('/admin/users');
}

export async function impersonateUserAction(userId) {
  const actor = await requireActor();
  if (!isAdmin(actor)) throw new Error('Forbidden');
  if (!userId) throw new Error('userId is required');
  if (userId === actor.id) throw new Error("You can't impersonate yourself");

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true },
  });
  if (!target) throw new Error('User not found');
  if (CODED_IN_IDS.includes(target.id) || rankOf(target) >= rankOf(actor)) {
    throw new Error("You can't impersonate a user at or above your own role");
  }

  await recordAudit({
    action: AUDIT.IMPERSONATION_STARTED,
    target: { type: 'user', id: userId, label: target.email },
    meta: { targetRole: target.role ?? null },
  });
  await auth.api.impersonateUser({ headers: await headers(), body: { userId } });
}

export async function stopImpersonatingAction() {
  const session = await getFullSession();
  const impersonatedBy = session?.session?.impersonatedBy ?? null;

  await recordAudit({
    action: AUDIT.IMPERSONATION_ENDED,
    target: { type: 'user', id: session?.user?.id, label: session?.user?.email },
    meta: { impersonatedBy },
  });
  await auth.api.stopImpersonating({ headers: await headers() });
}
