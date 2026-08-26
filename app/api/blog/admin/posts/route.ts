import { NextRequest } from 'next/server';
import { requireBlogIdentity } from '@/lib/blog-auth';
import { blogAdminError, blogAdminJson } from '@/lib/blog/admin-api';
import { blogPostInputSchema } from '@/lib/blog/admin-schema';
import { persistBlogPost } from '@/lib/blog/admin-service';
import { revalidateBlogPublication } from '@/lib/blog/revalidation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const identity = await requireBlogIdentity({
      roles: ['owner', 'editor', 'author', 'viewer'],
    });
    const status = request.nextUrl.searchParams.get('status') || '';
    const q = (request.nextUrl.searchParams.get('q') || '').trim().slice(0, 120);
    const page = Math.max(
      1,
      Number.parseInt(request.nextUrl.searchParams.get('page') || '1', 10) || 1
    );
    const pageSize = 30;
    const from = (page - 1) * pageSize;
    let query = identity.client
      .from('blog_posts')
      .select(
        'id, slug, locale, title, excerpt, status, author_name, is_featured, is_pinned, published_at, scheduled_for, updated_at, reading_minutes, category:blog_categories(id, name, slug), series:blog_series(id, title, slug)',
        { count: 'exact' }
      );
    if (status && ['draft', 'review', 'scheduled', 'published', 'archived'].includes(status)) {
      query = query.eq('status', status);
    }
    if (q) query = query.ilike('title', `%${q}%`);
    const { data, error, count } = await query
      .order('updated_at', { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    return blogAdminJson({
      posts: data || [],
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
    });
  } catch (error) {
    return blogAdminError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const identity = await requireBlogIdentity({
      roles: ['owner', 'editor', 'author'],
    });
    const input = blogPostInputSchema.parse(await request.json());
    const result = await persistBlogPost(identity, input);
    revalidateBlogPublication(input.slug);
    return blogAdminJson(result, 201);
  } catch (error) {
    return blogAdminError(error);
  }
}
