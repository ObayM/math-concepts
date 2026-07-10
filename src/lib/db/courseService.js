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

// the canonical url segment for a course — matches resolveCourseBySlug below
export function courseUrlSlug(course) {
  return course.slug ?? course.name.toLowerCase();
}

// slug lookup first, falling back to a case-insensitive name match for any
// course that predates the slug column
export async function resolveCourseBySlug(slug) {
  const bySlug = await getCourseBySlug(slug);
  if (bySlug) return bySlug;
  const all = await prisma.course.findMany();
  return all.find((c) => c.name.toLowerCase() === slug.toLowerCase()) ?? null;
}
