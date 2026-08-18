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
    forceNoIndex: isPreview || !isContentPublished(item.status, item.publishedAt),
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
      <article className="rounded-2xl border border-[#e2ddcf] bg-[#faf8f4] p-6 shadow-sm md:p-9">
        <p className="mb-7 border-b border-[#e2ddcf] pb-5 text-xs font-semibold uppercase tracking-wider text-[#78716c]">
          {item.authorName || data.profile.fullName}
          {item.publishedAt
            ? ` · ${new Intl.DateTimeFormat('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }).format(new Date(item.publishedAt))}`
            : ''}
        </p>
        <RichText content={item.content} />
        {!!item.references.length && (
          <section className="mt-10 border-t border-[#e2ddcf] pt-7">
            <h2 className="font-serif text-xl font-bold">Kaynaklar</h2>
            <ul className="mt-4 list-decimal space-y-2 pl-5 text-sm text-[#57534e]">
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
      </article>
    </SeoPageShell>
  );
}

function PreviewNotice() {
  return <p className="mb-6 rounded-xl border border-amber-300 bg-amber-100 p-3 text-xs font-bold text-amber-900">Admin önizlemesi · Bu sayfa indekslenmez.</p>;
}
