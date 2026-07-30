import { MetadataRoute } from 'next';
import { getPortfolioDataServer } from '@/lib/server-cms';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const data = await getPortfolioDataServer();
  const baseUrl = data.seoSettings?.canonicalUrl || 'https://muhammedakan.com';
  const cleanBase = baseUrl.replace(/\/+$/, '');

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/'],
    },
    sitemap: `${cleanBase}/sitemap.xml`,
  };
}
