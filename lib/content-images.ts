const EXACT_IMAGE_HOSTS = new Set([
  'lh3.googleusercontent.com',
  'images.unsplash.com',
  'www.muhammedakan.com',
  'muhammedakan.com',
]);

export function isOptimizableContentImage(value?: string): boolean {
  if (!value) return false;
  if (value.startsWith('/')) return true;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      (EXACT_IMAGE_HOSTS.has(url.hostname) || url.hostname.endsWith('.supabase.co'))
    );
  } catch {
    return false;
  }
}
