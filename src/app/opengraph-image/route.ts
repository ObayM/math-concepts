import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { headers } from 'next/headers';
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/locale';

export const dynamic = 'force-dynamic';

export async function GET() {
  const value = (await headers()).get('x-locale');
  const locale: Locale = isLocale(value) ? value : DEFAULT_LOCALE;

  const png = await readFile(path.join(process.cwd(), 'src/app/og-assets', `og-${locale}.png`));

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      Vary: 'Host',
    },
  });
}
