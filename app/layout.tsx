import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MUHAMMED AKAN | Akademik Portfolyo',
  description: 'İlahiyat Fakültesi Öğrencisi & Araştırmacı Muhammed Akan\'ın akademik portfolyosu. İslam Hukuku, Blok Zincir Teknolojisi ve Yapay Zeka Etiği.',
  keywords: ['Muhammed Akan', 'Akademik Portfolyo', 'İlahiyat', 'İslam Hukuku', 'Blok Zincir', 'Yapay Zeka Etiği'],
  authors: [{ name: 'Muhammed Akan' }],
  metadataBase: new URL('https://muhammedakan.vercel.app'),
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
    <html lang="tr" className={`${playfair.variable} ${inter.variable} scroll-smooth`}>
      <body className="bg-academic-bg text-slate-800 font-sans antialiased">
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        {children}
      </body>
    </html>
  );
}
