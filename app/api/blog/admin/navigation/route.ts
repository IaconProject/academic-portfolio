import { NextRequest } from 'next/server';
import { requireBlogIdentity } from '@/lib/blog-auth';
import { blogAdminError, blogAdminJson } from '@/lib/blog/admin-api';
import { blogNavigationInputSchema } from '@/lib/blog/admin-schema';
import { revalidateBlogPublication } from '@/lib/blog/revalidation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const identity = await requireBlogIdentity({
      roles: ['owner', 'editor', 'viewer'],
    });
    const { data, error } = await identity.client
      .from('blog_navigation_items')
      .select('*')
      .order('location')
      .order('sort_order');
    if (error) throw error;
    return blogAdminJson({ items: data || [] });
  } catch (error) {
    return blogAdminError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const input = blogNavigationInputSchema.parse(await request.json());
    const identity = await requireBlogIdentity({ roles: ['owner', 'editor'] });
    const items = input.items.map((item, index) => ({
      id: item.id || '',
      location: item.location,
      label: item.label,
      href: item.href,
      open_in_new_tab: item.openInNewTab,
      is_visible: item.isVisible,
      sort_order: index * 10,
    }));
    const { data, error } = await identity.client.rpc('save_blog_navigation', {
      items,
    });
    if (error) throw error;
    revalidateBlogPublication();
    return blogAdminJson({ items: data });
  } catch (error) {
    return blogAdminError(error);
  }
}
