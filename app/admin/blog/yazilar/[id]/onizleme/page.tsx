import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Eye } from 'lucide-react';
import { BlogCover } from '@/components/blog/BlogCover';
import { BlogMathRenderer } from '@/components/blog/BlogMathRenderer';
import { renderBlogContentHtml } from '@/lib/blog/content';
import { requireBlogIdentity } from '@/lib/blog-auth';

export const dynamic = 'force-dynamic';

export default async function BlogDraftPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const identity = await requireBlogIdentity({
    roles: ['owner', 'editor', 'author', 'viewer'],
  });
  const { data: post, error } = await identity.client
    .from('blog_posts')
    .select('*, category:blog_categories(name, slug), series:blog_series(title, slug), cover_asset:blog_assets(bucket_id, object_path, alt_text)')
    .eq('id', id)
    .maybeSingle();
  if (error || !post) notFound();

  const coverUrl =
    post.cover_asset?.object_path && post.cover_asset?.bucket_id
      ? identity.client.storage
          .from(post.cover_asset.bucket_id)
          .getPublicUrl(post.cover_asset.object_path).data.publicUrl
      : post.cover_image_url || '';

  return (
    <main className="mx-auto max-w-5xl" data-blog-article>
      <BlogMathRenderer />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-100 p-4 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
        <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em]">
          <Eye className="h-4 w-4" /> Yönetici önizlemesi · indekslenmez
        </p>
        <Link
          href={`/admin/blog/yazilar/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-black"
        >
          <ArrowLeft className="h-4 w-4" /> Editöre dön
        </Link>
      </div>

      <article className="overflow-hidden rounded-[2rem] border border-stone-200 bg-[#f9f6ef] shadow-xl dark:border-stone-800 dark:bg-stone-950">
        <header className="px-5 py-10 sm:px-10 sm:py-14">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400">
            {post.category?.name || 'Blog yazısı'} · {post.status}
          </p>
          <h1 className="mt-5 text-4xl font-black leading-tight tracking-[-0.045em] sm:text-5xl">
            {post.title}
          </h1>
          {post.subtitle ? (
            <p className="mt-4 text-xl font-semibold text-stone-700 dark:text-stone-200">
              {post.subtitle}
            </p>
          ) : null}
          <p className="mt-5 max-w-3xl text-base leading-7 text-stone-600 dark:text-stone-300">
            {post.excerpt}
          </p>
        </header>
        {coverUrl ? (
          <div className="px-5 sm:px-10">
            <BlogCover
              src={coverUrl}
              alt={post.cover_image_alt || post.title}
              className="aspect-[16/8.5] rounded-2xl"
              priority
            />
          </div>
        ) : null}
        <div
          className="blog-prose px-5 py-10 sm:px-10 sm:py-14"
          dangerouslySetInnerHTML={{
            __html: renderBlogContentHtml(
              post.content_html || '',
              post.content_text || ''
            ),
          }}
        />
      </article>
    </main>
  );
}
