import { NextRequest, NextResponse } from 'next/server';
import { requireBlogIdentity } from '@/lib/blog-auth';
import { blogAdminError, blogAdminJson } from '@/lib/blog/admin-api';
import { blogPostInputSchema } from '@/lib/blog/admin-schema';
import { persistBlogPost } from '@/lib/blog/admin-service';
import { revalidateBlogPublication } from '@/lib/blog/revalidation';

export const dynamic = 'force-dynamic';

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    const identity = await requireBlogIdentity({
      roles: ['owner', 'editor', 'author', 'viewer'],
    });
    const [postResult, tagsResult, sourcesResult, revisionsResult] =
      await Promise.all([
        identity.client
          .from('blog_posts')
          .select(
            '*, category:blog_categories(*), series:blog_series(*), cover_asset:blog_assets(*)'
          )
          .eq('id', id)
          .maybeSingle(),
        identity.client
          .from('blog_post_tags')
          .select('tag_id, tag:blog_tags(*)')
          .eq('post_id', id),
        identity.client
          .from('blog_post_sources')
          .select('*')
          .eq('post_id', id)
          .order('sort_order'),
        identity.client
          .from('blog_post_revisions')
          .select('id, revision_number, change_summary, created_by, created_at')
          .eq('post_id', id)
          .order('revision_number', { ascending: false })
          .limit(50),
      ]);
    const error =
      postResult.error ||
      tagsResult.error ||
      sourcesResult.error ||
      revisionsResult.error;
    if (error) throw error;
    if (!postResult.data) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Yazı bulunamadı.' },
        },
        { status: 404 }
      );
    }
    return blogAdminJson({
      post: postResult.data,
      tagIds: (tagsResult.data || []).map((item) => item.tag_id),
      sources: sourcesResult.data || [],
      revisions: revisionsResult.data || [],
    });
  } catch (error) {
    return blogAdminError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    const identity = await requireBlogIdentity({
      roles: ['owner', 'editor', 'author'],
    });
    const input = blogPostInputSchema.parse(await request.json());
    const result = await persistBlogPost(identity, input, id);
    revalidateBlogPublication(input.slug);
    return blogAdminJson(result);
  } catch (error) {
    return blogAdminError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    const identity = await requireBlogIdentity({
      roles: ['owner', 'editor', 'author'],
    });
    const previous = await identity.client
      .from('blog_posts')
      .select('slug')
      .eq('id', id)
      .maybeSingle();
    if (previous.error) throw previous.error;
    const { error } = await identity.client
      .from('blog_posts')
      .delete()
      .eq('id', id);
    if (error) throw error;
    revalidateBlogPublication(previous.data?.slug);
    return blogAdminJson({ deleted: true });
  } catch (error) {
    return blogAdminError(error);
  }
}
