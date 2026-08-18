'use server';

import { revalidatePath } from 'next/cache';
import { requireSuperAdmin } from '@/lib/authz';
import { prisma } from '@/lib/prisma';
import { resetLessonProgress } from '@/lib/db/progressService';
import { AUDIT, recordAudit } from '@/lib/db/auditService';

export async function resetStudentLessonAction(formData) {
  await requireSuperAdmin();
  const userId = formData.get('userId')?.toString();
  const lessonKey = formData.get('lessonKey')?.toString();
  if (!userId || !lessonKey) throw new Error('userId and lessonKey are required');

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  await resetLessonProgress(userId, lessonKey);
  await recordAudit({
    action: AUDIT.PROGRESS_RESET_BY_ADMIN,
    target: { type: 'user', id: userId, label: target?.email },
    meta: { lessonKey },
  });
  revalidatePath(`/admin/users/${userId}`);
}
