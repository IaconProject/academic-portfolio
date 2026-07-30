import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { VisitorTracker } from '@/components/public/VisitorTracker';
import { ConsentManager } from '@/components/public/ConsentManager';
import { getSeoExperienceData } from '@/lib/seo-repository';
import { buildSeoMetadata } from '@/lib/seo-metadata';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSeoExperienceData();
  return {
    ...buildSeoMetadata({
      data,
      routeKey: 'home',
      path: '/',
    }),
    icons: {
      icon: '/favicon.ico',
      apple: '/favicon.ico',
    },
    alternates: {
      canonical: '/',
      types: {
        'application/rss+xml': '/feed.xml',
      },
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getSeoExperienceData();
  return (
    <html lang="tr" className="scroll-smooth">
      <body className="bg-academic-bg text-slate-800 font-sans antialiased">
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <VisitorTracker />
        <ConsentManager
          enabled={Boolean(data.seoSettings.enableAnalytics)}
          measurementId={data.seoSettings.ga4MeasurementId}
        />
        {children}
      </body>
    </html>
  );
}
