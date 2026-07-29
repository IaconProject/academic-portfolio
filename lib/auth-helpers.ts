import crypto from 'crypto';

const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'academic-portfolio-admin-secret-key-v1';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Active in-memory session tokens store (Token -> { email, expiresAt })
const activeSessions = new Map<string, { email: string; expiresAt: number }>();

/**
 * Cryptographically hash a password using PBKDF2 with salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a plain password against a stored hash (or legacy plain text string).
 */
export function verifyPassword(password: string, storedHashOrPlain: string): boolean {
  if (!storedHashOrPlain) return false;

  // Support legacy plain text stored passwords if not yet migrated to hash format
  if (!storedHashOrPlain.includes(':')) {
    return password === storedHashOrPlain;
  }

  const [salt, originalHash] = storedHashOrPlain.split(':');
  if (!salt || !originalHash) return false;

  const hashToVerify = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(originalHash, 'hex'), Buffer.from(hashToVerify, 'hex'));
}

/**
 * Create a new secure session token for admin user.
 */
export function createSessionToken(email: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + TOKEN_TTL_MS;

  activeSessions.set(token, { email, expiresAt });
  return token;
}

/**
 * Validate session token from request headers or cookies.
 */
export function validateAdminSession(request: Request): boolean {
  try {
    let token = '';

    // Check Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    // Check custom header X-Admin-Token
    if (!token) {
      token = request.headers.get('x-admin-token') || '';
    }

    // Check Cookie header
    if (!token) {
      const cookieHeader = request.headers.get('cookie') || '';
      const match = cookieHeader.match(/admin_token=([^;]+)/);
      if (match) {
        token = match[1];
      }
    }

    if (!token) return false;

    // Check in-memory active sessions map
    const session = activeSessions.get(token);
    if (session) {
      if (Date.now() > session.expiresAt) {
        activeSessions.delete(token);
        return false;
      }
      return true;
    }

    // Fallback static token validation for stateless requests if session token matches process environment
    if (process.env.ADMIN_SESSION_TOKEN && token === process.env.ADMIN_SESSION_TOKEN) {
      return true;
    }

    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Revoke/delete a session token.
 */
export function destroySessionToken(token: string): void {
  activeSessions.delete(token);
}
