import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();
  const production =
    process.env.VERCEL_ENV === undefined || process.env.VERCEL_ENV === 'production';

  return {
    rules: production
      ? {
          userAgent: '*',
          allow: '/',
          disallow: ['/api/'],
        }
      : {
          userAgent: '*',
          disallow: '/',
        },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
