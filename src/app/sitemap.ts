import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { courseUrlSlug } from '@/lib/db/courseService';
import { getOrigin } from '@/lib/origin';

// one build serves both hosts, so this cannot be baked at build time
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await getOrigin();

  const staticRoutes = ['', '/login', '/signup', '/privacy', '/terms', '/prism'].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));

  let courseRoutes: MetadataRoute.Sitemap = [];
  try {
    const courses: { name: string; slug: string | null; updatedAt: Date }[] =
      await prisma.course.findMany({
        where: { status: 'published' },
        select: { name: true, slug: true, updatedAt: true },
      });
    courseRoutes = courses.map((course) => ({
      url: `${base}/courses/${courseUrlSlug(course)}`,
      lastModified: course.updatedAt,
    }));
  } catch {
    // a sitemap should never take the build down over a database blip
  }

  return [...staticRoutes, ...courseRoutes];
}
