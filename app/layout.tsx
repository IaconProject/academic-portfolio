import type { Metadata } from 'next';
import { Lora, Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { VisitorTracker } from '@/components/public/VisitorTracker';
import './globals.css';

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MUHAMMED AKAN | Akademik Portfolyo',
  description: 'İlahiyat Fakültesi Öğrencisi & Araştırmacı Muhammed Akan\'ın akademik portfolyosu. İslam Hukuku, Blok Zincir Teknolojisi ve Yapay Zeka Etiği.',
  keywords: ['Muhammed Akan', 'Akademik Portfolyo', 'İlahiyat', 'İslam Hukuku', 'Blok Zincir', 'Yapay Zeka Etiği'],
  authors: [{ name: 'Muhammed Akan' }],
  metadataBase: new URL('https://muhammedakan.vercel.app'),
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'MUHAMMED AKAN | Akademik Portfolyo',
    description: 'İlahiyat Fakültesi Öğrencisi & Araştırmacı Muhammed Akan\'ın akademik portfolyosu.',
    type: 'website',
    locale: 'tr_TR',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className={`${lora.variable} ${plusJakarta.variable} ${spaceGrotesk.variable} scroll-smooth`}>
      <body className="bg-academic-bg text-slate-800 font-sans antialiased">
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <VisitorTracker />
        {children}
      </body>
    </html>
  );
}
