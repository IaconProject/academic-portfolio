import 'server-only';

import { revalidatePath } from 'next/cache';

export function revalidateBlogPublication(slug?: string) {
  revalidatePath('/blog');
  revalidatePath('/blog/arsiv');
  revalidatePath('/blog/seriler');
  revalidatePath('/blog/feed.xml');
  revalidatePath('/feed.xml');
  revalidatePath('/sitemap.xml');
  if (slug) revalidatePath(`/blog/${slug}`);
}
