import { Nunito } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/layout/navbar';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { getUserInfo } from '@/components/auth/getUserInfo';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
});

export const metadata = {
  title: 'Mathly — Learn Math Visually',
  description: 'Interactive math lessons with visual intuition for Algebra and Geometry.',
};

export default async function RootLayout({ children }) {
  const userInfo = await getUserInfo();
  const pathname = (await headers()).get('x-pathname') ?? '';

  if (userInfo?.user && !userInfo.profile && !pathname.startsWith('/onboarding')) {
    redirect('/onboarding');
  }

  return (
    <html lang="en">
      <body className={`${nunito.variable} font-[family-name:var(--font-nunito)] antialiased`}>
        <AuthProvider initialUser={userInfo}>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
