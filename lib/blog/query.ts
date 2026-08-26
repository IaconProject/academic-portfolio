export type BlogSearchParams = Record<
  string,
  string | string[] | undefined
>;

export function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

export function positivePage(value: string | string[] | undefined) {
  const parsed = Number.parseInt(firstParam(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
