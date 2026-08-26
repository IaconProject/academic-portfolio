import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createAdminPasswordResetChallenge,
  verifyAdminPasswordResetChallenge,
} from '../lib/admin-password-reset';

const previousSecret = process.env.ADMIN_SESSION_SECRET;

describe('Yönetici parola sıfırlama doğrulaması', () => {
  beforeEach(() => {
    process.env.ADMIN_SESSION_SECRET = 'reset-test-secret-'.repeat(4);
  });

  afterEach(() => {
    if (previousSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = previousSecret;
  });

  it('doğru e-posta ve kodu kabul eder', () => {
    const token = createAdminPasswordResetChallenge({
      email: ' Bilgi@MuhammedAkan.com ',
      code: '123456',
      now: 1_000,
    });

    expect(
      verifyAdminPasswordResetChallenge({
        token,
        email: 'bilgi@muhammedakan.com',
        code: '123456',
        now: 2_000,
      })
    ).toEqual({ status: 'valid' });
  });

  it('token değiştirildiğinde doğrulamayı reddeder', () => {
    const token = createAdminPasswordResetChallenge({
      email: 'bilgi@muhammedakan.com',
      code: '123456',
    });
    const tampered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;

    expect(
      verifyAdminPasswordResetChallenge({
        token: tampered,
        email: 'bilgi@muhammedakan.com',
        code: '123456',
      })
    ).toEqual({ status: 'invalid' });
  });

  it('üç hatalı koddan sonra doğrulamayı kilitler', () => {
    let token = createAdminPasswordResetChallenge({
      email: 'bilgi@muhammedakan.com',
      code: '123456',
    });

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const result = verifyAdminPasswordResetChallenge({
        token,
        email: 'bilgi@muhammedakan.com',
        code: '000000',
      });
      expect(result.status).toBe('invalid');
      if (result.status === 'invalid') {
        expect(result.nextToken).toBeTruthy();
        token = result.nextToken || '';
      }
    }

    expect(
      verifyAdminPasswordResetChallenge({
        token,
        email: 'bilgi@muhammedakan.com',
        code: '000000',
      })
    ).toEqual({ status: 'locked' });
  });

  it('süresi dolan kodu reddeder', () => {
    const token = createAdminPasswordResetChallenge({
      email: 'bilgi@muhammedakan.com',
      code: '123456',
      now: 1_000,
    });

    expect(
      verifyAdminPasswordResetChallenge({
        token,
        email: 'bilgi@muhammedakan.com',
        code: '123456',
        now: 1_000 + 10 * 60 * 1_000,
      })
    ).toEqual({ status: 'expired' });
  });
});
