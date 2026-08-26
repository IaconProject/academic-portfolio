import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireBlogIdentity } from '@/lib/blog-auth';
import { blogAdminError, blogAdminJson } from '@/lib/blog/admin-api';
import { revalidateBlogPublication } from '@/lib/blog/revalidation';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { revisionId } = z
      .object({ revisionId: z.string().uuid() })
      .parse(await request.json());
    const identity = await requireBlogIdentity({ roles: ['owner', 'editor'] });
    const { data, error } = await identity.client.rpc(
      'restore_blog_home_revision',
      { revision_id: revisionId }
    );
    if (error) throw error;
    revalidateBlogPublication();
    return blogAdminJson({ sections: data, restored: true });
  } catch (error) {
    return blogAdminError(error);
  }
}
