import { notFound, permanentRedirect } from 'next/navigation';
import { draftMode } from 'next/headers';
import { getSeoExperienceData } from '@/lib/seo-repository';
import { buildSeoMetadata } from '@/lib/seo-metadata';
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  isContentPublished,
} from '@/lib/seo';
import {
  RichText,
  SeoPageShell,
  StructuredData,
} from '@/components/public/SeoPageShell';
import { AcademicContentDetail } from '@/components/public/AcademicContentDetail';
import { estimateReadingMinutes } from '@/lib/content-presentation';

export const revalidate = 300;

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps) {
  const isPreview = draftMode().isEnabled;
  const data = await getSeoExperienceData();
  const item = data.articles?.find(
    (entry) => entry.locale === 'tr' && entry.slug === params.slug
  );
  if (!item) return {};
  if (!isPreview && !isContentPublished(item.status, item.publishedAt)) {
    return { robots: { index: false, follow: false } };
  }
  return buildSeoMetadata({
    data,
    routeKey: `article:${item.id}`,
    path: `/yazilar/${params.slug}`,
    title: item.title,
    description: item.excerpt,
    imageUrl: item.coverImageUrl,
    type: 'article',
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt,
    forceNoIndex: isPreview,
  });
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const isPreview = draftMode().isEnabled;
  const data = await getSeoExperienceData();
  const item = data.articles?.find(
    (entry) => entry.locale === 'tr' && entry.slug === params.slug
  );
  if (!item) {
    const redirect = data.seoRedirects?.find(
      (entry) =>
        entry.isActive && entry.fromPath === `/yazilar/${params.slug}`
    );
    if (redirect) permanentRedirect(redirect.toPath);
    notFound();
  }
  if (!isPreview && !isContentPublished(item.status, item.publishedAt)) notFound();
  const path = `/yazilar/${params.slug}`;
  return (
    <SeoPageShell
      data={data}
      currentArchive="/yazilar"
      title={item.title}
      description={item.excerpt}
      eyebrow={item.topicCluster || 'Araştırma Yazısı'}
      breadcrumbs={[{ label: 'Yazılar', href: '/yazilar' }]}
    >
      {isPreview && <PreviewNotice />}
      <StructuredData value={buildArticleJsonLd(item, data)} />
      <StructuredData
        value={buildBreadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Yazılar', path: '/yazilar' },
          { name: item.title, path },
        ])}
      />
      <AcademicContentDetail
        coverImageUrl={item.coverImageUrl}
        coverImageAlt={item.coverImageAlt}
        meta={[
          item.authorName || data.profile.fullName,
          item.publishedAt
            ? new Intl.DateTimeFormat('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }).format(new Date(item.publishedAt))
            : '',
          `${estimateReadingMinutes(item.content)} dk okuma`,
        ]}
      >
        <RichText content={item.content} />
        {!!item.references.length && (
          <section className="mt-10 border-t border-academic-border pt-7">
            <h2 className="font-serif text-xl font-bold">Kaynaklar</h2>
            <ul className="mt-4 list-decimal space-y-2 pl-5 text-sm text-academic-slate">
              {item.references.map((reference) => (
                <li key={reference}>
                  {/^https?:\/\//i.test(reference) ? (
                    <a
                      href={reference}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all underline underline-offset-2"
                    >
                      {reference}
                    </a>
                  ) : (
                    reference
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </AcademicContentDetail>
    </SeoPageShell>
  );
}

function PreviewNotice() {
  return <p className="mb-6 rounded-2xl border border-amber-300 bg-amber-100 p-4 text-xs font-bold text-amber-900">Admin önizlemesi · Bu sayfa indekslenmez.</p>;
}
