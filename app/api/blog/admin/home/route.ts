import { NextRequest } from 'next/server';
import { requireBlogIdentity } from '@/lib/blog-auth';
import { blogAdminError, blogAdminJson } from '@/lib/blog/admin-api';
import { blogHomeInputSchema } from '@/lib/blog/admin-schema';
import { revalidateBlogPublication } from '@/lib/blog/revalidation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const identity = await requireBlogIdentity({
      roles: ['owner', 'editor', 'viewer'],
    });
    const [sections, revisions] = await Promise.all([
      identity.client
        .from('blog_home_sections')
        .select('*')
        .order('sort_order'),
      identity.client
        .from('blog_home_revisions')
        .select('id, change_summary, created_by, created_at')
        .order('created_at', { ascending: false })
        .limit(30),
    ]);
    if (sections.error || revisions.error) {
      throw sections.error || revisions.error;
    }
    return blogAdminJson({
      sections: sections.data || [],
      revisions: revisions.data || [],
    });
  } catch (error) {
    return blogAdminError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const identity = await requireBlogIdentity({ roles: ['owner', 'editor'] });
    const input = blogHomeInputSchema.parse(await request.json());
    const sections = input.sections.map((section, index) => ({
      id: section.id || '',
      section_type: section.sectionType,
      internal_name: section.internalName,
      heading: section.heading,
      subheading: section.subheading,
      is_enabled: section.isEnabled,
      sort_order: index * 10,
      config: section.config,
    }));
    const { data, error } = await identity.client.rpc(
      'save_blog_home_sections',
      {
        sections,
        change_summary:
          input.changeSummary || 'Ana sayfa blokları güncellendi',
      }
    );
    if (error) throw error;
    revalidateBlogPublication();
    return blogAdminJson({ sections: data });
  } catch (error) {
    return blogAdminError(error);
  }
}
