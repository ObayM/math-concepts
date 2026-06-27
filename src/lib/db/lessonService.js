import { prisma } from '@/lib/prisma';

export async function getLessonByKey(lessonKey) {
  return prisma.lesson.findUnique({ where: { lessonKey } });
}

export async function getLessonById(id) {
  return prisma.lesson.findUnique({ where: { id } });
}
