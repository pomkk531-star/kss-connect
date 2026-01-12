import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import UserInfo from "./components/UserInfo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KSS Connect — ระบบลงชื่อเข้าใช้งานนักเรียน",
  description: "หน้าเว็บสำหรับนักเรียนลงชื่อเข้าใช้งานและบันทึกเวลา",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 5.0,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Header with Logo */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-school-500 via-school-600 to-school-700 shadow-2xl border-b border-school-400/20 backdrop-blur-xl bg-opacity-95">
          <div className="w-full px-4 sm:px-6 py-2.5">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              {/* Logo Section */}
              <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                <div className="logo-container border-2 sm:border-3 border-school-200/40 rounded-lg sm:rounded-xl p-1 sm:p-1.5 bg-school-50 backdrop-blur-md shadow-lg shadow-school-300/20 flex-shrink-0">
                  <img 
                    src="/logo.svg" 
                    alt="โลโก้โรงเรียน" 
                    className="h-8 sm:h-12 w-auto object-contain drop-shadow-2xl"
                  />
                </div>
                <div className="hidden sm:block min-w-0">
                  <h1 className="text-lg font-bold text-white tracking-tight drop-shadow-md truncate">KSS Connect</h1>
                  <p className="text-xs text-white/90 font-medium truncate">ระบบเชื่อมต่อระหว่างนักเรียนและโรงเรียน</p>
                </div>
              </div>
              
              {/* Right side: UserInfo and Date */}
              <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
                <div className="block">
                  <UserInfo />
                </div>
                <div className="hidden lg:flex items-center gap-2 px-2 sm:px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-sm">
                  <svg className="w-3 sm:w-4 h-3 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs text-white font-medium whitespace-nowrap">{new Date().toLocaleDateString('th-TH')}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main content with padding for fixed header */}
        <main className="pt-14 sm:pt-16 w-full">
          {children}
        </main>
      </body>
    </html>
  );
}