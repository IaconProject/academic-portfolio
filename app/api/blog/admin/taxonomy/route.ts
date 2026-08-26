import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireBlogIdentity } from '@/lib/blog-auth';
import { blogAdminError, blogAdminJson } from '@/lib/blog/admin-api';
import {
  blogCategoryInputSchema,
  blogSeriesInputSchema,
  blogTagInputSchema,
} from '@/lib/blog/admin-schema';
import { revalidateBlogPublication } from '@/lib/blog/revalidation';

export const dynamic = 'force-dynamic';

const kindSchema = z.enum(['category', 'tag', 'series']);

export async function GET() {
  try {
    const identity = await requireBlogIdentity({
      roles: ['owner', 'editor', 'author', 'viewer'],
    });
    const [categories, tags, series] = await Promise.all([
      identity.client.from('blog_categories').select('*').order('sort_order'),
      identity.client.from('blog_tags').select('*').order('name'),
      identity.client.from('blog_series').select('*').order('sort_order'),
    ]);
    if (categories.error || tags.error || series.error) {
      throw categories.error || tags.error || series.error;
    }
    return blogAdminJson({
      categories: categories.data || [],
      tags: tags.data || [],
      series: series.data || [],
    });
  } catch (error) {
    return blogAdminError(error);
  }
}

function tableFor(kind: z.infer<typeof kindSchema>) {
  if (kind === 'category') return 'blog_categories' as const;
  if (kind === 'tag') return 'blog_tags' as const;
  return 'blog_series' as const;
}

function normalizeTaxonomy(kind: z.infer<typeof kindSchema>, item: unknown) {
  if (kind === 'category') {
    const value = blogCategoryInputSchema.parse(item);
    return {
      id: value.id || undefined,
      slug: value.slug,
      name: value.name,
      description: value.description,
      color: value.color,
      icon: value.icon,
      seo_title: value.seoTitle || null,
      seo_description: value.seoDescription || null,
      sort_order: value.sortOrder,
      is_active: value.isActive,
    };
  }
  if (kind === 'tag') {
    const value = blogTagInputSchema.parse(item);
    return {
      id: value.id || undefined,
      slug: value.slug,
      name: value.name,
      description: value.description,
      is_active: value.isActive,
    };
  }
  const value = blogSeriesInputSchema.parse(item);
  return {
    id: value.id || undefined,
    slug: value.slug,
    title: value.title,
    description: value.description,
    cover_asset_id: value.coverAssetId || null,
    seo_title: value.seoTitle || null,
    seo_description: value.seoDescription || null,
    sort_order: value.sortOrder,
    is_active: value.isActive,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { kind, item } = z
      .object({ kind: kindSchema, item: z.unknown() })
      .parse(await request.json());
    const identity = await requireBlogIdentity({ roles: ['owner', 'editor'] });
    const value = normalizeTaxonomy(kind, item);
    const { id, ...insertValue } = value;
    const { data, error } = await identity.client
      .from(tableFor(kind))
      .insert((id ? { ...insertValue, id } : insertValue) as never)
      .select('*')
      .single();
    if (error) throw error;
    revalidateBlogPublication();
    return blogAdminJson({ item: data }, 201);
  } catch (error) {
    return blogAdminError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { kind, item } = z
      .object({ kind: kindSchema, item: z.unknown() })
      .parse(await request.json());
    const identity = await requireBlogIdentity({ roles: ['owner', 'editor'] });
    const value = normalizeTaxonomy(kind, item);
    if (!value.id) throw new Error('Taxonomy id required');
    const { id, ...updateValue } = value;
    const { data, error } = await identity.client
      .from(tableFor(kind))
      .update(updateValue as never)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    revalidateBlogPublication();
    return blogAdminJson({ item: data });
  } catch (error) {
    return blogAdminError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const kind = kindSchema.parse(request.nextUrl.searchParams.get('kind'));
    const id = z.string().uuid().parse(request.nextUrl.searchParams.get('id'));
    const identity = await requireBlogIdentity({ roles: ['owner', 'editor'] });
    const { error } = await identity.client
      .from(tableFor(kind))
      .delete()
      .eq('id', id);
    if (error) throw error;
    revalidateBlogPublication();
    return blogAdminJson({ deleted: true });
  } catch (error) {
    return blogAdminError(error);
  }
}
