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

export const revalidate = 300;

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps) {
  const isPreview = draftMode().isEnabled;
  const data = await getSeoExperienceData();
  const item = data.projects.find(
    (entry) =>
      (entry.locale || 'tr') === 'tr' &&
      projectSlug(entry) === params.slug
  );
  if (!item) return {};
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
    forceNoIndex:
      isPreview || !isContentPublished(item.detailStatus, item.publishedAt),
  });
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const isPreview = draftMode().isEnabled;
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
  return (
    <SeoPageShell
      data={data}
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
      <article className="rounded-2xl border border-[#e2ddcf] bg-[#faf8f4] p-6 shadow-sm md:p-9">
        <p className="mb-7 border-b border-[#e2ddcf] pb-5 text-sm font-semibold text-[#57534e]">
          {item.years}
        </p>
        <RichText content={item.content || item.description} />
        {!!item.relatedPublicationIds?.length && (
          <section className="mt-10 border-t border-[#e2ddcf] pt-7">
            <h2 className="font-serif text-xl font-bold">İlgili yayınlar ve çıktılar</h2>
            <ul className="mt-4 space-y-3">
              {data.publications
                .filter((publication) =>
                  item.relatedPublicationIds?.includes(publication.id)
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
      </article>
    </SeoPageShell>
  );
}

function PreviewNotice() {
  return <p className="mb-6 rounded-xl border border-amber-300 bg-amber-100 p-3 text-xs font-bold text-amber-900">Admin önizlemesi · Bu sayfa indekslenmez.</p>;
}
