import { permanentRedirect } from 'next/navigation';

export default async function LegacyArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/blog/${encodeURIComponent(slug)}`);
}
