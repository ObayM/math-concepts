import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getFullSession } from '@/lib/authz';
import { clientIp } from '@/lib/request-ip';

export const AUDIT = {
  ROLE_SET: 'role.set',
  USER_BANNED: 'user.banned',
  USER_UNBANNED: 'user.unbanned',
  IMPERSONATION_STARTED: 'impersonation.started',
  IMPERSONATION_ENDED: 'impersonation.ended',
  LESSON_CREATED: 'lesson.created',
  LESSON_PUBLISHED: 'lesson.published',
  LESSON_PUBLISHED_WITH_FINDINGS: 'lesson.published_with_findings',
  LESSON_UNPUBLISHED: 'lesson.unpublished',
  LESSON_DELETED: 'lesson.deleted',
  LESSON_MOVED: 'lesson.moved',
  LESSONS_REORDERED: 'lessons.reordered',
  COURSE_CREATED: 'course.created',
  COURSE_UPDATED: 'course.updated',
  COURSE_PUBLISHED: 'course.published',
  COURSE_UNPUBLISHED: 'course.unpublished',
  COURSE_DELETED: 'course.deleted',
  COURSES_REORDERED: 'courses.reordered',
  PROGRESS_RESET_BY_ADMIN: 'progress.reset_by_admin',
};

export const AUDIT_ACTIONS = Object.values(AUDIT);

// best effort by design: a failed audit write must never roll back the action
// it describes, or a full disk would stop all admin work. a missing row shows
// up as a visible gap in the timeline instead.
export async function recordAudit({ action, target, meta }) {
  try {
    const [session, h] = await Promise.all([getFullSession(), headers()]);
    const actor = session?.user ?? null;

    await prisma.auditLog.create({
      data: {
        actorId: actor?.id ?? null,
        actorEmail: actor?.email ?? 'unknown',
        action,
        targetType: target?.type ?? null,
        targetId: target?.id ?? null,
        targetLabel: target?.label ?? null,
        meta: {
          ...(meta ?? {}),
          ...(session?.session?.impersonatedBy && {
            impersonatedBy: session.session.impersonatedBy,
          }),
        },
        ip: clientIp({ headers: h }),
        userAgent: h.get('user-agent'),
      },
    });
  } catch (err) {
    console.error('audit write failed', action, err);
  }
}

export async function listAuditLog({ cursor, limit = 50, action, actorId } = {}) {
  const rows = await prisma.auditLog.findMany({
    where: {
      ...(action && { action }),
      ...(actorId && { actorId }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  return {
    rows: rows.slice(0, limit),
    nextCursor: rows.length > limit ? rows[limit - 1].id : null,
  };
}

export async function listAuditActors() {
  const rows = await prisma.auditLog.findMany({
    distinct: ['actorId'],
    where: { actorId: { not: null } },
    select: { actorId: true, actorEmail: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows;
}
