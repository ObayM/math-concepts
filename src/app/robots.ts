import type { MetadataRoute } from 'next';
import { getOrigin } from '@/lib/origin';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await getOrigin();
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/dsl-preview'] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
