import { notFound, permanentRedirect } from 'next/navigation';
import { draftMode } from 'next/headers';
import { Calendar, ExternalLink } from 'lucide-react';
import { getSeoExperienceData } from '@/lib/seo-repository';
import { buildSeoMetadata } from '@/lib/seo-metadata';
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
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps) {
  const isPreview = draftMode().isEnabled;
  const data = await getSeoExperienceData();
  const item = data.publications.find(
    (entry) =>
      (entry.locale || 'tr') === 'tr' &&
      publicationSlug(entry) === params.slug
  );
  if (!item) return {};
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
    forceNoIndex:
      isPreview || !isContentPublished(item.detailStatus, item.publishedAt),
  });
}

export default async function PublicationDetailPage({ params }: PageProps) {
  const isPreview = draftMode().isEnabled;
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
  return (
    <SeoPageShell
      data={data}
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
      <article className="rounded-2xl border border-[#e2ddcf] bg-[#faf8f4] p-6 shadow-sm md:p-9">
        <div className="mb-7 flex flex-wrap gap-3 border-b border-[#e2ddcf] pb-5 text-xs font-semibold text-[#57534e]">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {item.year}
          </span>
          {item.publisher && <span>{item.publisher}</span>}
          {item.doi && item.doi !== '#' && <span>DOI: {item.doi}</span>}
        </div>
        <RichText content={item.content || item.excerpt} />
        {item.url && item.url !== '#' && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#1c2128] px-5 py-3 text-sm font-bold text-white"
          >
            Yayın kaynağını aç
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </article>
    </SeoPageShell>
  );
}

function PreviewNotice() {
  return <p className="mb-6 rounded-xl border border-amber-300 bg-amber-100 p-3 text-xs font-bold text-amber-900">Admin önizlemesi · Bu sayfa indekslenmez.</p>;
}
