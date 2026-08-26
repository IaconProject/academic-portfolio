import { describe, expect, it } from 'vitest';
import {
  buildNewsletterBroadcastMessage,
  buildNewsletterConfirmationMessage,
  createNewsletterConfirmationToken,
  createNewsletterUnsubscribeToken,
  escapeNewsletterHtml,
  hashNewsletterToken,
  normalizeNewsletterEmail,
} from '../lib/blog/newsletter-core';
import { blogNewsletterBroadcastInputSchema } from '../lib/blog/admin-schema';

describe('Blog bülteni token ve içerik sözleşmesi', () => {
  it('e-posta adresini karşılaştırma için güvenli biçimde normalleştirir', () => {
    expect(normalizeNewsletterEmail(' Test.User@Example.COM ')).toBe(
      'test.user@example.com'
    );
    expect(normalizeNewsletterEmail('not-an-email')).toBeNull();
    expect(normalizeNewsletterEmail(`${'a'.repeat(315)}@x.co`)).toBeNull();
  });

  it('yüksek entropili, URL güvenli ve birbirinden farklı doğrulama tokenları üretir', () => {
    const first = createNewsletterConfirmationToken();
    const second = createNewsletterConfirmationToken();
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first).not.toBe(second);
    expect(hashNewsletterToken(first)).toMatch(/^[a-f0-9]{64}$/);
  });

  it('abonelikten ayrılma tokenını normalize e-posta için deterministik üretir', () => {
    const secret = 's'.repeat(48);
    const lower = createNewsletterUnsubscribeToken(
      'reader@example.com',
      secret
    );
    const mixedCase = createNewsletterUnsubscribeToken(
      ' Reader@Example.COM ',
      secret
    );
    expect(lower).toBe(mixedCase);
    expect(lower).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(
      createNewsletterUnsubscribeToken('reader@example.com', 't'.repeat(48))
    ).not.toBe(lower);
    expect(() =>
      createNewsletterUnsubscribeToken('reader@example.com', 'short')
    ).toThrow('BLOG_NEWSLETTER_TOKEN_SECRET_TOO_SHORT');
  });

  it('e-posta kabuğundaki yönetici metinlerini HTML olarak kaçırır', () => {
    expect(escapeNewsletterHtml('<script>"x"</script>')).toBe(
      '&lt;script&gt;&quot;x&quot;&lt;/script&gt;'
    );
    const confirmation = buildNewsletterConfirmationMessage({
      confirmationUrl: 'https://example.com/confirm?token=safe',
      privacyUrl: 'https://example.com/gizlilik',
    });
    expect(confirmation.html).toContain('https://example.com/confirm?token=safe');
    expect(confirmation.text).toContain('Bu bağlantı 48 saat geçerlidir.');

    const broadcast = buildNewsletterBroadcastMessage({
      title: '<img src=x onerror=alert(1)>',
      previewText: 'Ön izleme',
      contentHtml: '<p>Önceden temizlenmiş içerik</p>',
      contentText: 'Önceden temizlenmiş içerik',
      unsubscribePageUrl: 'https://example.com/ayril?token=safe',
      privacyUrl: 'https://example.com/gizlilik',
    });
    expect(broadcast.html).not.toContain('<img src=x onerror=alert(1)>');
    expect(broadcast.html).toContain(
      '&lt;img src=x onerror=alert(1)&gt;'
    );
    expect(broadcast.html).toContain('<p>Önceden temizlenmiş içerik</p>');
    expect(broadcast.text).toContain('https://example.com/ayril?token=safe');
  });
});

describe('Blog bülteni yönetim doğrulaması', () => {
  const base = {
    title: 'Haftalık notlar',
    subject: 'Yeni yazılar',
    previewText: 'Bu hafta yayımlananlar',
    contentJson: { type: 'doc', content: [] },
    contentHtml: '<p>İçerik</p>',
  };

  it('taslağı zaman bilgisi olmadan kabul eder', () => {
    expect(
      blogNewsletterBroadcastInputSchema.safeParse({
        ...base,
        status: 'draft',
      }).success
    ).toBe(true);
  });

  it('zamanlanmış bültende tarih zorunlu kılar', () => {
    const result = blogNewsletterBroadcastInputSchema.safeParse({
      ...base,
      status: 'scheduled',
    });
    expect(result.success).toBe(false);
  });
});

