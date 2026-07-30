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

export async function generateMetadata(): Promise<Metadata> {
  const { getPortfolioDataServer } = await import('@/lib/server-cms');
  const data = await getPortfolioDataServer();
  const seo = data.seoSettings;
  const canonicalUrl = seo.canonicalUrl || 'https://muhammedakan.com';
  const keywordsArray = seo.keywords
    ? seo.keywords.split(',').map((k) => k.trim())
    : ['Muhammed Akan', 'Akademik Portfolyo'];

  return {
    title: seo.metaTitle || 'Muhammed Akan | Akademik Portfolyo',
    description: seo.metaDescription || 'Muhammed Akan akademik portfolyosu.',
    keywords: keywordsArray,
    authors: [{ name: seo.authorName || 'Muhammed Akan' }],
    metadataBase: new URL(canonicalUrl),
    alternates: {
      canonical: canonicalUrl,
    },
    icons: {
      icon: '/favicon.ico',
    },
    openGraph: {
      title: seo.metaTitle || 'Muhammed Akan | Akademik Portfolyo',
      description: seo.metaDescription || 'Muhammed Akan akademik portfolyosu.',
      url: canonicalUrl,
      siteName: seo.authorName ? `${seo.authorName} Akademik Portfolyo` : 'Muhammed Akan Akademik Portfolyo',
      images: seo.ogImageUrl ? [{ url: seo.ogImageUrl }] : [],
      type: 'website',
      locale: 'tr_TR',
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.metaTitle || 'Muhammed Akan | Akademik Portfolyo',
      description: seo.metaDescription || 'Muhammed Akan akademik portfolyosu.',
      images: seo.ogImageUrl ? [seo.ogImageUrl] : [],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

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
