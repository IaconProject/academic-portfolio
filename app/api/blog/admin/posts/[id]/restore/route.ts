import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireBlogIdentity } from '@/lib/blog-auth';
import { blogAdminError, blogAdminJson } from '@/lib/blog/admin-api';
import { revalidateBlogPublication } from '@/lib/blog/revalidation';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { revisionId } = z
      .object({ revisionId: z.string().uuid() })
      .parse(await request.json());
    const identity = await requireBlogIdentity({
      roles: ['owner', 'editor', 'author'],
    });
    const revision = await identity.client
      .from('blog_post_revisions')
      .select('post_id')
      .eq('id', revisionId)
      .eq('post_id', id)
      .maybeSingle();
    if (revision.error || !revision.data) {
      throw revision.error || new Error('Revision not found');
    }
    const { data, error } = await identity.client.rpc(
      'restore_blog_post_revision',
      { revision_id: revisionId }
    );
    if (error) throw error;
    const post = await identity.client
      .from('blog_posts')
      .select('slug')
      .eq('id', data as string)
      .maybeSingle();
    revalidateBlogPublication(post.data?.slug);
    return blogAdminJson({ id: data, restored: true });
  } catch (error) {
    return blogAdminError(error);
  }
}
