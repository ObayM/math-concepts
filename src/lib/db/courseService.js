import { prisma } from '@/lib/prisma';

export async function getCourses({ publishedOnly = false } = {}) {
  return prisma.course.findMany({
    where: publishedOnly ? { status: 'published' } : undefined,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getCourseById(id) {
  return prisma.course.findUnique({ where: { id } });
}

export async function getCourseBySlug(slug) {
  return prisma.course.findFirst({ where: { slug } });
}
