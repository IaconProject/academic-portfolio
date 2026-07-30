import { MetadataRoute } from 'next';
import { getPortfolioDataServer } from '@/lib/server-cms';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getPortfolioDataServer();
  const baseUrl = data.seoSettings?.canonicalUrl || 'https://muhammedakan.com';

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ];
}
