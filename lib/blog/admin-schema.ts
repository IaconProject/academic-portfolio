import { z } from 'zod';

const slugSchema = z
  .string()
  .trim()
  .min(1, 'URL kısa adı zorunludur.')
  .max(100)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Yalnızca küçük harf, rakam ve tire kullanın.'
  );

const optionalId = z.union([z.string().uuid(), z.literal('')]).optional();
const optionalDate = z
  .union([z.string().datetime({ offset: true }), z.literal(''), z.null()])
  .optional();

export const blogSourceInputSchema = z.object({
  id: optionalId,
  citationKey: z.string().trim().max(120).optional().default(''),
  title: z.string().trim().min(1, 'Kaynak başlığı zorunludur.').max(500),
  authors: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
  publisher: z.string().trim().max(240).default(''),
  publicationYear: z.number().int().min(1000).max(3000).nullable().optional(),
  url: z.union([z.string().url().max(2000), z.literal('')]).default(''),
  doi: z.string().trim().max(300).default(''),
  accessedAt: z.union([z.string().date(), z.literal('')]).default(''),
  sortOrder: z.number().int().min(-10000).max(10000).default(0),
});

export const blogPostInputSchema = z
  .object({
    id: optionalId,
    locale: z.enum(['tr', 'en']).default('tr'),
    slug: slugSchema,
    title: z.string().trim().min(1, 'Başlık zorunludur.').max(240),
    subtitle: z.string().trim().max(360).default(''),
    excerpt: z.string().trim().max(640).default(''),
    contentJson: z.record(z.string(), z.unknown()),
    contentHtml: z.string().max(2_000_000),
    status: z.enum(['draft', 'review', 'scheduled', 'published', 'archived']),
    authorName: z.string().trim().min(1).max(200),
    categoryId: optionalId,
    seriesId: optionalId,
    seriesOrder: z.number().int().min(1).max(10000).nullable().optional(),
    coverAssetId: optionalId,
    coverImageUrl: z.union([z.string().url().max(2000), z.literal('')]).default(''),
    coverImageAlt: z.string().trim().max(500).default(''),
    canonicalUrl: z.union([z.string().url().max(2000), z.literal('')]).default(''),
    seoTitle: z.string().trim().max(120).default(''),
    seoDescription: z.string().trim().max(320).default(''),
    focusKeyword: z.string().trim().max(160).default(''),
    relatedKeywords: z.array(z.string().trim().min(1).max(160)).max(30).default([]),
    tagIds: z.array(z.string().uuid()).max(50).default([]),
    sources: z.array(blogSourceInputSchema).max(100).default([]),
    isFeatured: z.boolean().default(false),
    isPinned: z.boolean().default(false),
    sortOrder: z.number().int().min(-10000).max(10000).default(0),
    allowIndexing: z.boolean().default(true),
    publishedAt: optionalDate,
    scheduledFor: optionalDate,
    changeSummary: z.string().trim().max(500).default(''),
  })
  .superRefine((value, context) => {
    if (value.status === 'scheduled' && !value.scheduledFor) {
      context.addIssue({
        code: 'custom',
        path: ['scheduledFor'],
        message: 'Zamanlanmış bir yazı için yayın tarihi zorunludur.',
      });
    }
    if (value.coverImageUrl && !value.coverImageAlt) {
      context.addIssue({
        code: 'custom',
        path: ['coverImageAlt'],
        message: 'Kapak görseli için alternatif metin zorunludur.',
      });
    }
  });

export const blogHomeSectionSchema = z.object({
  id: optionalId,
  sectionType: z.enum([
    'hero',
    'featured_posts',
    'latest_posts',
    'category_grid',
    'series_spotlight',
    'newsletter',
    'rich_text',
  ]),
  internalName: z.string().trim().min(1).max(160),
  heading: z.string().trim().max(240).default(''),
  subheading: z.string().trim().max(640).default(''),
  isEnabled: z.boolean().default(true),
  sortOrder: z.number().int().min(-10000).max(10000),
  config: z.record(z.string(), z.unknown()).default({}),
});

export const blogHomeInputSchema = z.object({
  sections: z.array(blogHomeSectionSchema).min(1).max(30),
  changeSummary: z.string().trim().max(500).default(''),
});

export const blogNavigationItemSchema = z.object({
  id: optionalId,
  location: z.enum(['header', 'footer', 'legal']),
  label: z.string().trim().min(1).max(120),
  href: z
    .string()
    .trim()
    .min(1)
    .max(2000)
    .refine((value) => value.startsWith('/') || value.startsWith('https://'), {
      message: 'Bağlantı / ile veya https:// ile başlamalıdır.',
    }),
  openInNewTab: z.boolean().default(false),
  isVisible: z.boolean().default(true),
  sortOrder: z.number().int().min(-10000).max(10000),
});

export const blogNavigationInputSchema = z.object({
  items: z.array(blogNavigationItemSchema).max(100),
});

export const blogSettingsInputSchema = z.object({
  siteName: z.string().trim().min(1).max(180),
  tagline: z.string().trim().max(320),
  description: z.string().trim().min(1).max(640),
  locale: z.enum(['tr', 'en']),
  postsPerPage: z.number().int().min(3).max(48),
  authorName: z.string().trim().min(1).max(200),
  authorBio: z.string().trim().max(3000),
  socialLinks: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(80),
        url: z.string().url().max(2000),
      })
    )
    .max(20),
  theme: z.record(z.string(), z.unknown()),
  seo: z.record(z.string(), z.unknown()),
  newsletter: z.record(z.string(), z.unknown()),
});

export const blogNewsletterBroadcastInputSchema = z
  .object({
    id: optionalId,
    title: z.string().trim().min(1, 'İç başlık zorunludur.').max(240),
    subject: z.string().trim().min(1, 'E-posta konusu zorunludur.').max(240),
    previewText: z.string().trim().max(300).default(''),
    contentJson: z.record(z.string(), z.unknown()),
    contentHtml: z.string().max(500_000),
    status: z.enum(['draft', 'scheduled']).default('draft'),
    scheduledFor: optionalDate,
  })
  .superRefine((value, context) => {
    if (value.status === 'scheduled' && !value.scheduledFor) {
      context.addIssue({
        code: 'custom',
        path: ['scheduledFor'],
        message: 'Zamanlanmış bir bülten için gönderim tarihi zorunludur.',
      });
    }
  });

export const blogNewsletterSubscriberActionSchema = z.object({
  id: z.string().uuid(),
  action: z.literal('unsubscribe'),
});

const taxonomyBase = {
  id: optionalId,
  slug: slugSchema,
  isActive: z.boolean().default(true),
};

export const blogCategoryInputSchema = z.object({
  ...taxonomyBase,
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).default(''),
  color: z.string().trim().min(1).max(40).default('amber'),
  icon: z.string().trim().min(1).max(80).default('folder'),
  seoTitle: z.string().trim().max(120).default(''),
  seoDescription: z.string().trim().max(320).default(''),
  sortOrder: z.number().int().min(-10000).max(10000).default(0),
});

export const blogTagInputSchema = z.object({
  ...taxonomyBase,
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).default(''),
});

export const blogSeriesInputSchema = z.object({
  ...taxonomyBase,
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).default(''),
  coverAssetId: optionalId,
  seoTitle: z.string().trim().max(120).default(''),
  seoDescription: z.string().trim().max(320).default(''),
  sortOrder: z.number().int().min(-10000).max(10000).default(0),
});

export type BlogPostInput = z.infer<typeof blogPostInputSchema>;
export type BlogNewsletterBroadcastInput = z.infer<
  typeof blogNewsletterBroadcastInputSchema
>;
