import { prisma } from '@/lib/prisma';

function langFilter(lang) {
  return lang ? { lang } : {};
}

/** @param {{ publishedOnly?: boolean, lang?: string }} [options] */
export async function getCourses({ publishedOnly = false, lang } = {}) {
  const where = { ...(publishedOnly && { status: 'published' }), ...langFilter(lang) };
  return prisma.course.findMany({
    where: Object.keys(where).length ? where : undefined,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getCourseById(id) {
  return prisma.course.findUnique({ where: { id } });
}

export async function getCourseBySlug(slug, lang) {
  return prisma.course.findFirst({ where: { slug, ...langFilter(lang) } });
}

// the canonical url segment for a course, matching resolveCourseBySlug below
export function courseUrlSlug(course) {
  return course.slug ?? course.name.toLowerCase();
}

// slug lookup first, falling back to a case-insensitive name match for any
// course that predates the slug column. both halves are scoped by language, or
// an arabic course answers to an english url.
export async function resolveCourseBySlug(slug, lang) {
  const bySlug = await getCourseBySlug(slug, lang);
  if (bySlug) return bySlug;
  const all = await prisma.course.findMany({ where: langFilter(lang) });
  return all.find((c) => c.name.toLowerCase() === slug.toLowerCase()) ?? null;
}
