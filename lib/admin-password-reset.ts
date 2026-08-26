import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const ADMIN_PASSWORD_RESET_COOKIE = 'admin_password_reset';
export const ADMIN_PASSWORD_RESET_TTL_SECONDS = 10 * 60;
const MAX_TOKEN_BYTES = 4096;
const MAX_ATTEMPTS = 3;

interface ResetChallengePayload {
  email: string;
  nonce: string;
  codeDigest: string;
  expiresAt: number;
  attempts: number;
}

type ResetVerificationResult =
  | { status: 'valid' }
  | { status: 'invalid'; nextToken?: string }
  | { status: 'expired' | 'locked' };

function resetSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim() || '';
  if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('ADMIN_SESSION_SECRET_TOO_SHORT');
  }
  return secret;
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function signPayload(payload: ResetChallengePayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString(
    'base64url'
  );
  const signature = createHmac('sha256', resetSecret())
    .update(`admin-password-reset:${encoded}`, 'utf8')
    .digest('base64url');
  return `${encoded}.${signature}`;
}

function decodePayload(token: string): ResetChallengePayload | null {
  if (!token || Buffer.byteLength(token, 'utf8') > MAX_TOKEN_BYTES) return null;
  const [encoded, signature, extra] = token.split('.');
  if (!encoded || !signature || extra) return null;

  const expected = createHmac('sha256', resetSecret())
    .update(`admin-password-reset:${encoded}`, 'utf8')
    .digest('base64url');
  if (!safeEqual(signature, expected)) return null;

  try {
    const value = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as Partial<ResetChallengePayload>;
    if (
      typeof value.email !== 'string' ||
      typeof value.nonce !== 'string' ||
      typeof value.codeDigest !== 'string' ||
      typeof value.expiresAt !== 'number' ||
      typeof value.attempts !== 'number' ||
      !Number.isSafeInteger(value.expiresAt) ||
      !Number.isSafeInteger(value.attempts) ||
      value.attempts < 0 ||
      value.attempts > MAX_ATTEMPTS
    ) {
      return null;
    }
    return value as ResetChallengePayload;
  } catch {
    return null;
  }
}

function codeDigest({
  email,
  nonce,
  code,
}: {
  email: string;
  nonce: string;
  code: string;
}): string {
  return createHmac('sha256', resetSecret())
    .update(`admin-password-reset-code:${email}:${nonce}:${code}`, 'utf8')
    .digest('base64url');
}

export function createAdminPasswordResetChallenge({
  email,
  code,
  now = Date.now(),
}: {
  email: string;
  code: string;
  now?: number;
}): string {
  const normalizedEmail = email.trim().toLowerCase();
  const nonce = randomBytes(18).toString('base64url');
  return signPayload({
    email: normalizedEmail,
    nonce,
    codeDigest: codeDigest({ email: normalizedEmail, nonce, code }),
    expiresAt: now + ADMIN_PASSWORD_RESET_TTL_SECONDS * 1000,
    attempts: 0,
  });
}

export function verifyAdminPasswordResetChallenge({
  token,
  email,
  code,
  now = Date.now(),
}: {
  token: string;
  email: string;
  code: string;
  now?: number;
}): ResetVerificationResult {
  const payload = decodePayload(token);
  if (!payload || payload.email !== email.trim().toLowerCase()) {
    return { status: 'invalid' };
  }
  if (payload.expiresAt <= now) return { status: 'expired' };
  if (payload.attempts >= MAX_ATTEMPTS) return { status: 'locked' };

  const submittedDigest = codeDigest({
    email: payload.email,
    nonce: payload.nonce,
    code,
  });
  if (safeEqual(payload.codeDigest, submittedDigest)) {
    return { status: 'valid' };
  }

  const attempts = payload.attempts + 1;
  if (attempts >= MAX_ATTEMPTS) return { status: 'locked' };
  return {
    status: 'invalid',
    nextToken: signPayload({ ...payload, attempts }),
  };
}
