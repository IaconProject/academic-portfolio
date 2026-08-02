export function normalizeOptionalUrl(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const normalized = value.trim();
  return normalized === '#' ? '' : normalized;
}

const FIELD_LABELS: Record<string, string> = {
  id: 'İçerik kimliği',
  title: 'Başlık',
  description: 'Kısa proje açıklaması',
  years: 'Yıllar',
  slug: 'URL kısa adı',
  locale: 'Dil',
  translationGroupId: 'Çeviri grubu',
  excerpt: 'Özet',
  content: 'Zengin içerik',
  coverImageUrl: 'Kapak görseli URL’si',
  coverImageAlt: 'Kapak görseli alt metni',
  publishedAt: 'Yayın tarihi',
  url: 'Dış bağlantı',
  relatedPublicationIds: 'İlgili yayınlar',
  tags: 'Etiketler',
  type: 'Yayın türü',
  publisher: 'Yayıncı / dergi',
  year: 'Yıl',
  doi: 'DOI',
};

export function firstValidationMessage(
  fields: Record<string, string[] | undefined> | undefined,
  fallback: string
): string {
  if (!fields) return fallback;
  const entry = Object.entries(fields).find(([, messages]) => Boolean(messages?.length));
  if (!entry) return fallback;
  const [field, messages] = entry;
  return `${FIELD_LABELS[field] || field}: ${messages?.[0]}`;
}
