import { getSeoExperienceData } from '@/lib/seo-repository';
import {
  absoluteUrl,
  findSeoPage,
  isContentPublished,
  normalizeSeoSettings,
  plainText,
  projectSlug,
  publicationSlug,
} from '@/lib/seo';

export const revalidate = 300;

export async function GET() {
  const data = await getSeoExperienceData();
  const settings = normalizeSeoSettings(data.seoSettings, data.profile.fullName);
  const homePage = findSeoPage(data.seoPages, 'home');
  const subjectName = settings.authorName || data.profile.fullName;
  const topics = settings.keywords
    .split(',')
    .map((topic) => topic.trim())
    .filter(Boolean);
  const publishedWorks = [
    ...data.publications
      .filter((item) => isContentPublished(item.detailStatus, item.publishedAt))
      .map((item) => ({
        title: item.title,
        url: absoluteUrl(`/yayinlar/${publicationSlug(item)}`),
      })),
    ...data.projects
      .filter((item) => isContentPublished(item.detailStatus, item.publishedAt))
      .map((item) => ({
        title: item.title,
        url: absoluteUrl(`/projeler/${projectSlug(item)}`),
      })),
    ...(data.articles || [])
      .filter((item) => isContentPublished(item.status, item.publishedAt))
      .map((item) => ({
        title: item.title,
        url: absoluteUrl(`/yazilar/${item.slug}`),
      })),
  ];

  const lines = [
    `# ${subjectName}`,
    '',
    `> ${plainText(homePage.description || settings.metaDescription)}`,
    '',
    `Canonical source: ${absoluteUrl('/')}`,
    `Language: tr-TR`,
    '',
    '## Muhammed Akan kimdir?',
    '',
    `${subjectName}, ${data.profile.title.toLocaleLowerCase('tr-TR')}. ${plainText(
      data.profile.subtitle
    )}`,
    '',
    plainText(data.profile.bio),
    '',
    '## Çalışma alanları',
    '',
    ...(topics.length ? topics.map((topic) => `- ${topic}`) : ['- Akademik araştırmalar']),
    '',
    '## Birincil sayfalar',
    '',
    `- [Biyografi ve akademik özgeçmiş](${absoluteUrl('/')})`,
    `- [Akademik yayınlar](${absoluteUrl('/yayinlar')})`,
    `- [Araştırma projeleri](${absoluteUrl('/projeler')})`,
    `- [Akademik yazılar](${absoluteUrl('/yazilar')})`,
    ...(publishedWorks.length
      ? [
          '',
          '## Yayınlanmış çalışmalar',
          '',
          ...publishedWorks.map((work) => `- [${work.title}](${work.url})`),
        ]
      : []),
    '',
    'Bu dosya, AI ajanlarına birincil ve canonical kaynakları gösteren yardımcı bir keşif özetidir. Esas doğruluk kaynağı bağlantılı HTML sayfalarıdır.',
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Language': 'tr-TR',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
      'X-Robots-Tag': 'noindex, follow',
    },
  });
}
