import { MetadataRoute } from 'next';
import { getSeoExperienceData } from '@/lib/seo-repository';
import { getSiteUrl, normalizeSeoSettings } from '@/lib/seo';

export const revalidate = 300;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = getSiteUrl();
  const production =
    process.env.VERCEL_ENV === undefined || process.env.VERCEL_ENV === 'production';
  const data = await getSeoExperienceData();
  const settings = normalizeSeoSettings(data.seoSettings, data.profile.fullName);
  const activeRules = settings.robotsRules.filter((rule) => rule.enabled);

  return {
    rules: production
      ? (activeRules.length
          ? activeRules.map((rule) => ({
              userAgent: rule.userAgents,
              ...(rule.allow.length ? { allow: rule.allow } : {}),
              ...(rule.disallow.length ? { disallow: rule.disallow } : {}),
            }))
          : {
              userAgent: '*',
              allow: '/',
              disallow: ['/api/'],
            })
      : {
          userAgent: '*',
          disallow: '/',
        },
    sitemap:
      production && settings.sitemapConfig.enabled
        ? `${baseUrl}/sitemap.xml`
        : undefined,
    host: baseUrl,
  };
}
