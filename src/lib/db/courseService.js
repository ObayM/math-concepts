import { prisma } from '@/lib/prisma';

export async function getCourses() {
  return prisma.course.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function getCourseById(id) {
  return prisma.course.findUnique({ where: { id } });
}
