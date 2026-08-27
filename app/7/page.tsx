import type { Metadata } from 'next';
import { PortfolioClientView } from '@/components/public/PortfolioClientView';
import { getSeoExperienceData } from '@/lib/seo-repository';

export const revalidate = 300;

// /7 is a private campaign entry point used in the Instagram biography. It
// intentionally renders the portfolio without redirecting so the browser and
// collector retain the exact campaign path.
export const metadata: Metadata = {
  alternates: { canonical: '/' },
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nocache: true,
  },
};

export default async function InstagramBiographyEntryPage() {
  const data = await getSeoExperienceData();
  return <PortfolioClientView initialData={data} />;
}
