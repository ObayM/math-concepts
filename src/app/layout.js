import { Aldrich } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/navbar";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { getUserInfo } from "@/components/auth/getUserInfo";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Snow from "@/components/layout/snow";

const aldrich = Aldrich({
  variable: "--font-aldrich",
  subsets: ["latin"],
  weight: "400",
});

export const metadata = {
  title: "Mathly — Learn Math Visually",
  description: "Interactive math lessons with visual intuition for Algebra and Geometry.",
};

export default async function RootLayout({ children }) {
  const userInfo = await getUserInfo();
  const pathname = (await headers()).get("x-pathname") ?? "";

  if (userInfo?.user && !userInfo.profile && !pathname.startsWith("/onboarding")) {
    redirect("/onboarding");
  }

  return (
    <html lang="en">
      <body className={`${aldrich.className} antialiased`}>
        <AuthProvider initialUser={userInfo}>
          <Navbar />
          <Snow />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
