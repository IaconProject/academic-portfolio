import { NextRequest } from 'next/server';
import { requireBlogIdentity } from '@/lib/blog-auth';
import { blogAdminError, blogAdminJson } from '@/lib/blog/admin-api';
import { blogSettingsInputSchema } from '@/lib/blog/admin-schema';
import { revalidateBlogPublication } from '@/lib/blog/revalidation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const identity = await requireBlogIdentity({
      roles: ['owner', 'editor', 'viewer'],
    });
    const { data, error } = await identity.client
      .from('blog_settings')
      .select('*')
      .eq('id', 1)
      .single();
    if (error) throw error;
    return blogAdminJson({ settings: data });
  } catch (error) {
    return blogAdminError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const input = blogSettingsInputSchema.parse(await request.json());
    const identity = await requireBlogIdentity({ roles: ['owner', 'editor'] });
    const { data, error } = await identity.client
      .from('blog_settings')
      .update({
        site_name: input.siteName,
        tagline: input.tagline,
        description: input.description,
        locale: input.locale,
        posts_per_page: input.postsPerPage,
        author_name: input.authorName,
        author_bio: input.authorBio,
        social_links: input.socialLinks,
        theme: input.theme,
        seo: input.seo,
        newsletter: input.newsletter,
        updated_by: identity.userId,
      })
      .eq('id', 1)
      .select('*')
      .single();
    if (error) throw error;
    revalidateBlogPublication();
    return blogAdminJson({ settings: data });
  } catch (error) {
    return blogAdminError(error);
  }
}
