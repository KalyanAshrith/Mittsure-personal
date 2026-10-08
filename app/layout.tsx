import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'Mittsure Field Route & School CRM',
  description: 'Specialized field outreach, daily route planning and school CRM for Mittsure Technologies Mysuru',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#E6EDF6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#E6EDF6] text-[#020C21] min-h-screen flex antialiased selection:bg-[#4A78B0] selection:text-white relative">
        {/* Subtle luminous crystal ambient caustics */}
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-br from-white/80 via-blue-100/30 to-transparent blur-3xl opacity-80" />
          <div className="absolute top-[30%] -right-[15%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-bl from-slate-200/50 via-sky-100/25 to-transparent blur-3xl opacity-70" />
          <div className="absolute -bottom-[20%] left-[15%] w-[75vw] h-[65vw] rounded-full bg-gradient-to-tr from-white/70 via-blue-50/35 to-transparent blur-3xl opacity-80" />
        </div>

        <Navigation />
        <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
          <Header />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
