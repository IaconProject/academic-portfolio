import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireBlogIdentity } from '@/lib/blog-auth';
import { blogAdminError, blogAdminJson } from '@/lib/blog/admin-api';
import { sendBlogNewsletterBroadcast } from '@/lib/blog/newsletter-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireBlogIdentity({ roles: ['owner'] });
    const { id } = await context.params;
    const broadcastId = z.string().uuid().parse(id);
    const input = z
      .object({ confirm: z.literal(true) })
      .strict()
      .parse(await request.json());
    if (!input.confirm) throw new Error('CONFIRMATION_REQUIRED');
    const result = await sendBlogNewsletterBroadcast(broadcastId, {
      allowEarly: true,
    });
    return blogAdminJson(result);
  } catch (error) {
    return blogAdminError(error);
  }
}

