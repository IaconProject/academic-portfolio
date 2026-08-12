'use client';

/**
 * Admin oturum token'ını localStorage'da 7 günlük TTL ile saklar.
 *
 * Neden bu yardımcı var?
 *   - sessionStorage tarayıcı/sekme kapatılınca silinir; bu da kullanıcıyı
 *     her sekmeyi yeniden açtığında yeniden login'e zorlar.
 *   - localStorage ise kalıcıdır; bu yüzden saklanan token'ın son kullanma
 *     tarihini (expiresAt) kendimiz tutmamız gerekir.
 *
 * Yapı:
 *   Her anahtar için değer `{ token, expiresAt }` JSON olarak saklanır.
 *   `readSessionItem` çağrıldığında süresi dolmuş değer otomatik olarak
 *   temizlenir. Bu sayede eski bir token ile API'ye istek atılması önlenir.
 *
 * Güvenlik:
 *   - Bu yardımcı sadece UI tarafı için (X-Admin-Token header'ı). Gerçek
 *     doğrulama sunucu tarafında `auth-helpers.ts` üzerinden yapılır.
 *   - Sunucu tarafı `httpOnly` cookie hâlâ birincil doğrulama kanalıdır; bu
 *     helper yalnızca client tarafında cookie olmadan da istek atabilmek
 *     için bir "yedek taşıyıcı" görevi görür (CSR fetch'ler için).
 */

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — auth-helpers.ts ile senkron

type SessionEnvelope = {
  token: string;
  expiresAt: number;
};

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readEnvelope(key: string): SessionEnvelope | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionEnvelope;
    if (
      !parsed ||
      typeof parsed.token !== 'string' ||
      typeof parsed.expiresAt !== 'number'
    ) {
      window.localStorage.removeItem(key);
      return null;
    }
    if (parsed.expiresAt <= Date.now()) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    return null;
  }
}

export function readSessionItem(key: string): string | null {
  return readEnvelope(key)?.token ?? null;
}

export function writeSessionItem(key: string, token: string): void {
  if (!isBrowser()) return;
  try {
    const envelope: SessionEnvelope = {
      token,
      expiresAt: Date.now() + SESSION_TTL_MS,
    };
    window.localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // localStorage dolu veya kapalı — sessizce yoksay
  }
}

export function removeSessionItem(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Tüm admin oturum anahtarlarını temizler. Çıkış veya süresi dolmuş
 * oturumda çağrılır.
 */
export function clearAdminSession(): void {
  if (!isBrowser()) return;
  for (const key of ['academic_admin_auth', 'admin_token']) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}
