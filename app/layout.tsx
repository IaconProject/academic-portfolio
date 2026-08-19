import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import { AnalyticsRuntime } from '@/components/public/AnalyticsRuntime';
import {
  PublicExperience,
  publicThemeBootScript,
} from '@/components/public/PublicExperience';
import { getSeoExperienceData } from '@/lib/seo-repository';
import { buildSeoMetadata } from '@/lib/seo-metadata';
import './globals.css';

// Android Chrome ignores theme colors whose computed lightness exceeds 0.94.
// Keep this in sync with `academic-bg` in tailwind.config.js.
const SITE_THEME_COLOR = '#f3efe6';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: SITE_THEME_COLOR },
    { media: '(prefers-color-scheme: dark)', color: '#101215' },
  ],
  colorScheme: 'light dark',
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
    <html
      lang="tr"
      className="scroll-smooth"
      data-public-light-palette={data.tabBarSettings.lightPalette}
      data-public-dark-palette={data.tabBarSettings.darkPalette}
      suppressHydrationWarning
    >
      <head>
        <script
          id="public-theme-boot"
          dangerouslySetInnerHTML={{ __html: publicThemeBootScript }}
        />
      </head>
      <body className="bg-academic-bg text-academic-ink font-sans antialiased">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'rgb(var(--academic-surface))',
              color: 'rgb(var(--academic-ink))',
              border: '1px solid rgb(var(--academic-border))',
            },
          }}
        />
        <AnalyticsRuntime
          measurementId={data.seoSettings.ga4MeasurementId}
        />
        <PublicExperience
          settings={data.tabBarSettings}
          email={data.profile.email}
        >
          {children}
        </PublicExperience>
      </body>
    </html>
  );
}
