import { notFound, permanentRedirect } from 'next/navigation';
import { draftMode } from 'next/headers';
import { ExternalLink } from 'lucide-react';
import { AcademicContentDetail } from '@/components/public/AcademicContentDetail';
import { estimateReadingMinutes } from '@/lib/content-presentation';
import { getSeoExperienceData } from '@/lib/seo-repository';
import { buildSeoMetadata } from '@/lib/seo-metadata';
import { safeHttpUrl } from '@/lib/url-security';
import {
  buildBreadcrumbJsonLd,
  buildPublicationJsonLd,
  isContentPublished,
  publicationSlug,
} from '@/lib/seo';
import {
  RichText,
  SeoPageShell,
  StructuredData,
} from '@/components/public/SeoPageShell';

export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(props: PageProps) {
  const params = await props.params;
  const isPreview = (await draftMode()).isEnabled;
  const data = await getSeoExperienceData();
  const item = data.publications.find(
    (entry) =>
      (entry.locale || 'tr') === 'tr' &&
      publicationSlug(entry) === params.slug
  );
  if (!item) return {};
  if (!isPreview && !isContentPublished(item.detailStatus, item.publishedAt)) {
    return { robots: { index: false, follow: false } };
  }
  return buildSeoMetadata({
    data,
    routeKey: `publication:${item.id}`,
    path: `/yayinlar/${params.slug}`,
    title: item.title,
    description: item.excerpt || item.content || item.publisher,
    imageUrl: item.coverImageUrl,
    type: 'article',
    publishedAt: item.publishedAt || item.year,
    updatedAt: item.updatedAt,
    forceNoIndex: isPreview,
  });
}

export default async function PublicationDetailPage(props: PageProps) {
  const params = await props.params;
  const isPreview = (await draftMode()).isEnabled;
  const data = await getSeoExperienceData();
  const item = data.publications.find(
    (entry) =>
      (entry.locale || 'tr') === 'tr' &&
      publicationSlug(entry) === params.slug
  );

  if (!item) {
    const redirect = data.seoRedirects?.find(
      (entry) =>
        entry.isActive &&
        entry.fromPath === `/yayinlar/${params.slug}`
    );
    if (redirect) permanentRedirect(redirect.toPath);
    notFound();
  }
  if (!isPreview && !isContentPublished(item.detailStatus, item.publishedAt)) notFound();

  const path = `/yayinlar/${params.slug}`;
  const sourceUrl = safeHttpUrl(item.url);
  return (
    <SeoPageShell
      data={data}
      currentArchive="/yayinlar"
      title={item.title}
      description={item.excerpt}
      eyebrow={item.type}
      breadcrumbs={[{ label: 'Yayınlar', href: '/yayinlar' }]}
    >
      {isPreview && <PreviewNotice />}
      <StructuredData value={buildPublicationJsonLd(item, data)} />
      <StructuredData
        value={buildBreadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Yayınlar', path: '/yayinlar' },
          { name: item.title, path },
        ])}
      />
      <AcademicContentDetail
        coverImageUrl={item.coverImageUrl}
        coverImageAlt={item.coverImageAlt}
        meta={[
          item.type,
          item.year,
          item.publisher || '',
          item.doi && item.doi !== '#' ? `DOI: ${item.doi}` : '',
          `${estimateReadingMinutes(item.content || item.excerpt)} dk okuma`,
        ]}
        footer={
          sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-academic-accent px-5 py-3 text-sm font-bold text-academic-on-accent transition hover:bg-academic-accent-strong"
            >
              Yayın kaynağını aç
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : undefined
        }
      >
        <RichText content={item.content || item.excerpt} />
      </AcademicContentDetail>
    </SeoPageShell>
  );
}

function PreviewNotice() {
  return <p className="mb-6 rounded-2xl border border-amber-300 bg-amber-100 p-4 text-xs font-bold text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/35 dark:text-amber-200">Admin önizlemesi · Bu sayfa indekslenmez.</p>;
}
