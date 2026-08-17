import { describe, expect, it } from 'vitest';
import {
  optionalUrlSchema,
} from '../lib/admin-content-validation';
import {
  firstValidationMessage,
  normalizeOptionalUrl,
} from '../lib/admin-content-utils';

describe('admin content validation', () => {
  it('normalizes legacy hash links and whitespace to an empty optional URL', () => {
    expect(normalizeOptionalUrl('#')).toBe('');
    expect(normalizeOptionalUrl('  #  ')).toBe('');
    expect(optionalUrlSchema.parse('#')).toBe('');
    expect(optionalUrlSchema.parse('   ')).toBe('');
  });

  it('accepts real URLs and rejects malformed external links', () => {
    expect(optionalUrlSchema.parse(' https://example.com/project ')).toBe(
      'https://example.com/project'
    );
    expect(() => optionalUrlSchema.parse('example.com/project')).toThrow();
    expect(() => optionalUrlSchema.parse('javascript:alert(1)')).toThrow();
    expect(() => optionalUrlSchema.parse('ftp://example.com/file')).toThrow();
  });

  it('turns API field errors into actionable Turkish admin feedback', () => {
    expect(firstValidationMessage(
      { url: ['Geçerli bir URL girin.'] },
      'İçerik alanlarını kontrol edin.'
    )).toBe('Dış bağlantı: Geçerli bir URL girin.');
  });
});
