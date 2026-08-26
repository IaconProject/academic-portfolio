import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireBlogIdentity } from '@/lib/blog-auth';
import { blogAdminError, blogAdminJson } from '@/lib/blog/admin-api';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const identity = await requireBlogIdentity({
      roles: ['owner', 'editor', 'author', 'viewer'],
    });
    const includeDeleted =
      request.nextUrl.searchParams.get('deleted') === 'true' &&
      ['owner', 'editor'].includes(identity.role);
    let query = identity.client
      .from('blog_assets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (!includeDeleted) query = query.is('deleted_at', null);
    const { data, error } = await query;
    if (error) throw error;
    const assets = (data || []).map((asset) => ({
      ...asset,
      public_url: identity.client.storage
        .from('blog-media')
        .getPublicUrl(asset.object_path).data.publicUrl,
    }));
    return blogAdminJson({ assets });
  } catch (error) {
    return blogAdminError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const input = z
      .object({
        id: z.string().uuid(),
        altText: z.string().trim().max(500),
        caption: z.string().trim().max(1000),
        credit: z.string().trim().max(500),
        focalX: z.number().min(0).max(1),
        focalY: z.number().min(0).max(1),
        restore: z.boolean().optional().default(false),
      })
      .parse(await request.json());
    const identity = await requireBlogIdentity({
      roles: ['owner', 'editor', 'author'],
    });
    const { data, error } = await identity.client
      .from('blog_assets')
      .update({
        alt_text: input.altText,
        caption: input.caption,
        credit: input.credit,
        focal_x: input.focalX,
        focal_y: input.focalY,
        ...(input.restore ? { deleted_at: null } : {}),
      })
      .eq('id', input.id)
      .select('*')
      .single();
    if (error) throw error;
    return blogAdminJson({ asset: data });
  } catch (error) {
    return blogAdminError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = z.string().uuid().parse(request.nextUrl.searchParams.get('id'));
    const identity = await requireBlogIdentity({ roles: ['owner', 'editor'] });
    const { error } = await identity.client
      .from('blog_assets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    return blogAdminJson({ deleted: true, recoverable: true });
  } catch (error) {
    return blogAdminError(error);
  }
}
