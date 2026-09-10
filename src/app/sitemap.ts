import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { courseUrlSlug } from '@/lib/db/courseService';
import { getOrigin } from '@/lib/origin';
import { DEFAULT_LOCALE, localeFromHost } from '@/lib/locale';
import { headers } from 'next/headers';

// one build serves both hosts, so this cannot be baked at build time
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await getOrigin();
  const host = (await headers()).get('x-forwarded-host') ?? (await headers()).get('host');
  const lang = localeFromHost(host) ?? DEFAULT_LOCALE;

  const staticRoutes = [
    '',
    '/login',
    '/signup',
    '/courses',
    '/warmup',
    '/privacy',
    '/terms',
    '/prism',
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));

  let contentRoutes: MetadataRoute.Sitemap = [];
  try {
    const courses = await prisma.course.findMany({
      where: { status: 'published', lang },
      select: {
        name: true,
        slug: true,
        updatedAt: true,
        lessons: {
          where: { status: 'published' },
          select: { lessonKey: true, publishedAt: true, updatedAt: true },
        },
      },
    });

    contentRoutes = courses.flatMap((course) => {
      const path = `${base}/courses/${courseUrlSlug(course)}`;
      return [
        { url: path, lastModified: course.updatedAt },
        ...course.lessons.map((lesson) => ({
          url: `${path}/${lesson.lessonKey}`,
          lastModified: lesson.publishedAt ?? lesson.updatedAt,
        })),
      ];
    });
  } catch {
    // a sitemap should never take the build down over a database blip
  }

  return [...staticRoutes, ...contentRoutes];
}
