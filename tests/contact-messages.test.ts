import { describe, expect, it } from 'vitest';
import {
  contactMessageInputSchema,
  escapeHtml,
  mapContactMessage,
} from '../lib/contact-messages';

describe('contact message contract', () => {
  it('normalizes a valid public form submission', () => {
    const result = contactMessageInputSchema.parse({
      name: '  Muhammed Akan  ',
      email: 'test@example.com',
      message: '  Akademik çalışmalarınız hakkında bilgi rica ederim.  ',
    });

    expect(result.name).toBe('Muhammed Akan');
    expect(result.subject).toBe('Genel İletişim');
    expect(result.phone).toBe('');
    expect(result.message).toBe('Akademik çalışmalarınız hakkında bilgi rica ederim.');
  });

  it('rejects malformed and oversized input', () => {
    expect(() => contactMessageInputSchema.parse({
      name: 'A',
      email: 'invalid',
      message: 'x',
    })).toThrow();
    expect(() => contactMessageInputSchema.parse({
      name: 'Geçerli İsim',
      email: 'test@example.com',
      message: 'x'.repeat(10_001),
    })).toThrow();
  });

  it('maps database fields without inventing transient IDs', () => {
    const message = mapContactMessage({
      id: '08c01a34-8641-4a02-bbf2-7ed820bbb15e',
      name: 'Test',
      email: 'test@example.com',
      subject: 'Konu',
      phone: null,
      message: 'Mesaj içeriği',
      is_read: false,
      is_starred: true,
      ip_address: null,
      created_at: '2026-08-02T19:00:00.000Z',
    });

    expect(message.id).toBe('08c01a34-8641-4a02-bbf2-7ed820bbb15e');
    expect(message.isRead).toBe(false);
    expect(message.isStarred).toBe(true);
    expect(message.phone).toBe('');
  });

  it('escapes visitor-controlled values before inserting them into email HTML', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)"> & test')).toBe(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; test'
    );
  });
});
