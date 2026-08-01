import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import { AnalyticsRuntime } from '@/components/public/AnalyticsRuntime';
import { getSeoExperienceData } from '@/lib/seo-repository';
import { buildSeoMetadata } from '@/lib/seo-metadata';
import './globals.css';

const SITE_THEME_COLOR = '#f7f5f0';

export const viewport: Viewport = {
  themeColor: SITE_THEME_COLOR,
  colorScheme: 'light',
};

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
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: data.seoSettings.siteName || data.profile.fullName,
    },
    other: {
      'msapplication-navbutton-color': SITE_THEME_COLOR,
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
        <AnalyticsRuntime
          measurementId={data.seoSettings.ga4MeasurementId}
        />
        {children}
      </body>
    </html>
  );
}
