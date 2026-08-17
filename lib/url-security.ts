export function safeHttpUrl(value?: string | null): string | undefined {
  const normalized = value?.trim();
  if (!normalized || normalized === '#') return undefined;

  try {
    const url = new URL(normalized);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? normalized
      : undefined;
  } catch {
    return undefined;
  }
}
