import { describe, expect, it } from 'vitest';
import { safeHttpUrl } from '../lib/url-security';

describe('safeHttpUrl', () => {
  it('allows only absolute HTTP and HTTPS links', () => {
    expect(safeHttpUrl('https://example.com/path')).toBe('https://example.com/path');
    expect(safeHttpUrl(' http://example.com ')).toBe('http://example.com');
    expect(safeHttpUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeHttpUrl('ftp://example.com/file')).toBeUndefined();
    expect(safeHttpUrl('/relative')).toBeUndefined();
  });

  it('normalizes empty and legacy placeholder values', () => {
    expect(safeHttpUrl('')).toBeUndefined();
    expect(safeHttpUrl('#')).toBeUndefined();
    expect(safeHttpUrl(undefined)).toBeUndefined();
  });
});
