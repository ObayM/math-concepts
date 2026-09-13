import { fontVars } from '@/lib/fonts';
import '../globals.css';
import 'katex/dist/katex.min.css';
import Navbar from '@/components/layout/navbar';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { getUserInfo } from '@/components/auth/getUserInfo';
import ImpersonationBanner from '@/components/admin/ImpersonationBanner';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/layout/BottomNav';
import ServiceWorker from '@/components/layout/ServiceWorker';
import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { LOCALES, DEFAULT_LOCALE, dirFor, isLocale } from '@/lib/locale';
import { getOrigin, originForLocale, hasLocaleOrigins } from '@/lib/origin';
import { LocaleProvider } from '@/components/i18n/LocaleProvider';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

const TITLE = {
  en: 'Mathly — make math click',
  ar: 'ماثلي — خلي الرياضيات تبان',
};

const DESCRIPTION = {
  en: 'Interactive math lessons you can drag, build and poke at, with a tutor that can see the question you are stuck on.',
  ar: 'دروس رياضيات تفاعلية تقدر تسحبها وتبنيها وتجرب فيها، ومعها مدرّس يشوف السؤال اللي واقف عنده.',
};

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const origin = await getOrigin();
  const title = TITLE[locale];
  const description = DESCRIPTION[locale];

  return {
    metadataBase: new URL(origin),
    title: { default: title, template: '%s · Mathly' },
    description,
    applicationName: 'Mathly',
    // without per-locale hosts every entry would resolve to the same url, which
    // tells a crawler the two languages are the same page
    ...(hasLocaleOrigins && {
      alternates: {
        languages: {
          ...Object.fromEntries(LOCALES.map((l) => [l, `${originForLocale(l)}/`])),
          'x-default': `${originForLocale(DEFAULT_LOCALE)}/`,
        },
      },
    }),
    openGraph: {
      type: 'website',
      siteName: 'Mathly',
      locale,
      title,
      description,
      url: origin,
      images: [{ url: `${origin}/opengraph-image`, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${origin}/opengraph-image`],
    },
  };
}

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export default async function RootLayout({ children, params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const userInfo = await getUserInfo();
  const pathname = (await headers()).get('x-pathname') ?? '';
  const chromeless = pathname.startsWith('/dsl-preview') || pathname.startsWith('/prism');

  if (
    userInfo?.user &&
    !userInfo.profile &&
    !userInfo.isImpersonating &&
    !pathname.startsWith('/onboarding')
  ) {
    redirect('/onboarding');
  }

  return (
    <html lang={lang} dir={dirFor(lang)} suppressHydrationWarning>
      <body className={`${fontVars} antialiased`}>
        <LocaleProvider lang={lang}>
          <AuthProvider initialUser={userInfo}>
            <ServiceWorker />
            <ImpersonationBanner />
            {chromeless ? (
              children
            ) : (
              <div className="bg-app flex min-h-dvh flex-col">
                <Navbar />
                <div className="flex-1">{children}</div>
                {!pathname.startsWith('/admin') && <Footer />}
                {!pathname.startsWith('/admin') && <BottomNav />}
              </div>
            )}
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
