import { Nunito, Fraunces, IBM_Plex_Sans_Arabic, Rubik } from 'next/font/google';

export const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
});

export const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '900'],
  display: 'swap',
});

// next/font is module scope, so both families sit in every route's graph. no
// preload means the browser only fetches these once arabic text actually uses
// them, which keeps them off english pages entirely.
export const plexArabic = IBM_Plex_Sans_Arabic({
  variable: '--font-ar-body',
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  preload: false,
});

export const rubik = Rubik({
  variable: '--font-ar-display',
  subsets: ['arabic'],
  weight: ['500', '600', '700'],
  display: 'swap',
  preload: false,
});

export const fontVars = [nunito, fraunces, plexArabic, rubik].map((f) => f.variable).join(' ');
