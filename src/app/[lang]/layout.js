import { Nunito, Fraunces } from 'next/font/google';
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
import { LOCALES, dirFor, isLocale } from '@/lib/locale';
import { LocaleProvider } from '@/components/i18n/LocaleProvider';

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
});

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '900'],
  display: 'swap',
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export const metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'Mathly — make math click',
    template: '%s · Mathly',
  },
  description:
    'Interactive math lessons you can drag, build and poke at, with a tutor that can see the question you are stuck on.',
  applicationName: 'Mathly',
  openGraph: {
    type: 'website',
    siteName: 'Mathly',
    title: 'Mathly — make math click',
    description:
      'Interactive math lessons you can drag, build and poke at, with a tutor that can see the question you are stuck on.',
    url: appUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mathly — make math click',
    description: 'Interactive math lessons that respond to you.',
  },
};

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
      <body
        className={`${nunito.variable} ${fraunces.variable} font-[family-name:var(--font-nunito)] antialiased`}
      >
        <LocaleProvider lang={lang}>
          <AuthProvider initialUser={userInfo}>
            <ServiceWorker />
            <ImpersonationBanner />
            {chromeless ? (
              children
            ) : (
              <div className="flex min-h-dvh flex-col">
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
