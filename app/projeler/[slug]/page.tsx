import { notFound, permanentRedirect } from 'next/navigation';
import { draftMode } from 'next/headers';
import { getSeoExperienceData } from '@/lib/seo-repository';
import { buildSeoMetadata } from '@/lib/seo-metadata';
import {
  buildBreadcrumbJsonLd,
  buildProjectJsonLd,
  isContentPublished,
  projectSlug,
  publicationSlug,
} from '@/lib/seo';
import {
  RichText,
  SeoPageShell,
  StructuredData,
} from '@/components/public/SeoPageShell';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { AcademicContentDetail } from '@/components/public/AcademicContentDetail';
import { estimateReadingMinutes } from '@/lib/content-presentation';
import { safeHttpUrl } from '@/lib/url-security';

export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(props: PageProps) {
  const params = await props.params;
  const isPreview = (await draftMode()).isEnabled;
  const data = await getSeoExperienceData();
  const item = data.projects.find(
    (entry) =>
      (entry.locale || 'tr') === 'tr' &&
      projectSlug(entry) === params.slug
  );
  if (!item) return {};
  if (!isPreview && !isContentPublished(item.detailStatus, item.publishedAt)) {
    return { robots: { index: false, follow: false } };
  }
  return buildSeoMetadata({
    data,
    routeKey: `project:${item.id}`,
    path: `/projeler/${params.slug}`,
    title: item.title,
    description: item.excerpt || item.description,
    imageUrl: item.coverImageUrl,
    type: 'article',
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt,
    forceNoIndex: isPreview,
  });
}

export default async function ProjectDetailPage(props: PageProps) {
  const params = await props.params;
  const isPreview = (await draftMode()).isEnabled;
  const data = await getSeoExperienceData();
  const item = data.projects.find(
    (entry) =>
      (entry.locale || 'tr') === 'tr' &&
      projectSlug(entry) === params.slug
  );
  if (!item) {
    const redirect = data.seoRedirects?.find(
      (entry) =>
        entry.isActive && entry.fromPath === `/projeler/${params.slug}`
    );
    if (redirect) permanentRedirect(redirect.toPath);
    notFound();
  }
  if (!isPreview && !isContentPublished(item.detailStatus, item.publishedAt)) notFound();
  const path = `/projeler/${params.slug}`;
  const projectUrl = safeHttpUrl(item.url);
  return (
    <SeoPageShell
      data={data}
      currentArchive="/projeler"
      title={item.title}
      description={item.excerpt || item.description}
      eyebrow="Araştırma Projesi"
      breadcrumbs={[{ label: 'Projeler', href: '/projeler' }]}
    >
      {isPreview && <PreviewNotice />}
      <StructuredData value={buildProjectJsonLd(item, data)} />
      <StructuredData
        value={buildBreadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Projeler', path: '/projeler' },
          { name: item.title, path },
        ])}
      />
      <AcademicContentDetail
        coverImageUrl={item.coverImageUrl}
        coverImageAlt={item.coverImageAlt}
        meta={[
          item.years,
          ...item.tags.slice(0, 4),
          `${estimateReadingMinutes(item.content || item.description)} dk okuma`,
        ]}
        footer={
          projectUrl ? (
            <a href={projectUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-academic-accent px-5 py-3 text-sm font-bold text-academic-on-accent transition hover:bg-academic-accent-strong">
              Proje bağlantısını aç <ExternalLink className="h-4 w-4" />
            </a>
          ) : undefined
        }
      >
        <RichText content={item.content || item.description} />
        {!!item.relatedPublicationIds?.length && (
          <section className="mt-10 border-t border-academic-border pt-7">
            <h2 className="font-serif text-xl font-bold">İlgili yayınlar ve çıktılar</h2>
            <ul className="mt-4 space-y-3">
              {data.publications
                .filter((publication) =>
                  item.relatedPublicationIds?.includes(publication.id) &&
                  (isPreview ||
                    isContentPublished(
                      publication.detailStatus,
                      publication.publishedAt
                    ))
                )
                .map((publication) => (
                  <li key={publication.id} className="text-sm">
                    {isContentPublished(
                      publication.detailStatus,
                      publication.publishedAt
                    ) ? (
                      <Link
                        href={`/yayinlar/${publicationSlug(publication)}`}
                        className="font-bold underline underline-offset-2"
                      >
                        {publication.title}
                      </Link>
                    ) : (
                      publication.title
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
  return <p className="mb-6 rounded-2xl border border-amber-300 bg-amber-100 p-4 text-xs font-bold text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/35 dark:text-amber-200">Admin önizlemesi · Bu sayfa indekslenmez.</p>;
}
