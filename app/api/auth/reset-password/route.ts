import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { sendOtpEmail } from '@/lib/email-service';
import { hashPassword } from '@/lib/auth-helpers';
import { checkRateLimit } from '@/lib/rate-limiter';
import {
  ADMIN_PASSWORD_RESET_COOKIE,
  ADMIN_PASSWORD_RESET_TTL_SECONDS,
  createAdminPasswordResetChallenge,
  verifyAdminPasswordResetChallenge,
} from '@/lib/admin-password-reset';
import {
  readAdminCredentials,
  writeAdminCredentials,
} from '@/lib/admin-credentials.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function resetCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: ADMIN_PASSWORD_RESET_TTL_SECONDS,
    path: '/api/auth/reset-password',
  };
}

function clearResetCookie(response: NextResponse) {
  response.cookies.set(ADMIN_PASSWORD_RESET_COOKIE, '', {
    ...resetCookieOptions(),
    maxAge: 0,
  });
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const body = await request.json();
    const { action, email, otpCode, newPassword } = body;

    const normalizedEmail = (email || '').trim().toLowerCase();
    let credentials;
    try {
      credentials = await readAdminCredentials();
    } catch (error) {
      console.error('[reset-password] credential read failed', error);
      return NextResponse.json(
        { success: false, error: 'Yönetici hesabı şu anda doğrulanamıyor.' },
        { status: 503 }
      );
    }
    const activeAdminEmail = credentials.email.trim().toLowerCase();

    // ── ACTION 1: Request OTP Code ──
    if (action === 'request_otp') {
      // Rate limit OTP requests: max 3 per 10 minutes per IP
      const rateCheck = checkRateLimit(`otp_${clientIp}`, 3, 10 * 60 * 1000);
      if (!rateCheck.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: `Çok fazla kod talebinde bulunuldu. Lütfen ${Math.ceil(rateCheck.resetSeconds / 60)} dakika sonra tekrar deneyin.`,
          },
          { status: 429 }
        );
      }

      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        return NextResponse.json({ success: false, error: 'Lütfen geçerli bir e-posta adresi girin.' }, { status: 400 });
      }

      const envAdminEmail = process.env.CMS_ADMIN_EMAIL?.trim().toLowerCase();
      const validAdminEmails = [
        envAdminEmail,
        activeAdminEmail,
      ].filter(Boolean);

      const isValidEmail = validAdminEmails.includes(normalizedEmail);

      if (!isValidEmail) {
        return NextResponse.json(
          { success: false, error: `Girdiğiniz e-posta adresi (${normalizedEmail}) sistemdeki kayıtlı yönetici e-postası ile eşleşmiyor.` },
          { status: 403 }
        );
      }

      // Generate cryptographically secure 6-digit OTP code using crypto.randomInt
      const code = crypto.randomInt(100000, 1000000).toString();
      // Send OTP via Resend API
      const sent = await sendOtpEmail({ toEmail: normalizedEmail, otpCode: code });

      if (!sent) {
        return NextResponse.json(
          { success: false, error: 'Doğrulama e-postası gönderilemedi. Lütfen kısa süre sonra tekrar deneyin.' },
          { status: 502 }
        );
      }

      const response = NextResponse.json({
        success: true,
        message: `6 haneli doğrulama kodu ${normalizedEmail} adresine gönderildi. Lütfen e-posta gelen kutunuzu (ve Spam klasörünü) kontrol edin.`,
      });
      response.cookies.set(
        ADMIN_PASSWORD_RESET_COOKIE,
        createAdminPasswordResetChallenge({
          email: normalizedEmail,
          code,
        }),
        resetCookieOptions()
      );
      return response;
    }

    // ── ACTION 2: Verify OTP and Update Password ──
    if (action === 'verify_and_reset') {
      if (!normalizedEmail || normalizedEmail !== activeAdminEmail) {
        return NextResponse.json({ success: false, error: 'E-posta doğrulaması başarısız.' }, { status: 403 });
      }

      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
        return NextResponse.json(
          { success: false, error: 'Yeni şifreniz güvenlik nedeniyle en az 8 karakter olmalıdır.' },
          { status: 400 }
        );
      }

      const verification = verifyAdminPasswordResetChallenge({
        token:
          request.cookies.get(ADMIN_PASSWORD_RESET_COOKIE)?.value || '',
        email: normalizedEmail,
        code: (otpCode || '').trim(),
      });
      if (verification.status !== 'valid') {
        const status = verification.status === 'locked' ? 429 : 400;
        const message =
          verification.status === 'expired'
            ? 'Doğrulama kodunun süresi dolmuş. Lütfen yeni kod talep edin.'
            : verification.status === 'locked'
              ? 'Çok fazla hatalı kod denemesi yapıldı. Lütfen yeni kod talep edin.'
              : 'Doğrulama kodu hatalı veya artık geçerli değil.';
        const response = NextResponse.json(
          { success: false, error: message },
          { status }
        );
        if (
          verification.status === 'invalid' &&
          verification.nextToken
        ) {
          response.cookies.set(
            ADMIN_PASSWORD_RESET_COOKIE,
            verification.nextToken,
            resetCookieOptions()
          );
        } else {
          clearResetCookie(response);
        }
        return response;
      }

      const hashedPassword = hashPassword(newPassword);
      try {
        await writeAdminCredentials({
          email: normalizedEmail,
          password: hashedPassword,
        });
      } catch (error) {
        console.error('[reset-password] credential write failed', error);
        return NextResponse.json(
          { success: false, error: 'Yeni şifre kalıcı olarak kaydedilemedi. Lütfen tekrar deneyin.' },
          { status: 503 }
        );
      }
      const response = NextResponse.json({
        success: true,
        message: 'Şifreniz güvenle güncellendi. Yeni şifrenizle giriş yapabilirsiniz.',
      });
      clearResetCookie(response);
      return response;
    }

    return NextResponse.json({ success: false, error: 'Geçersiz işlem.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Şifre sıfırlama hatası.' }, { status: 500 });
  }
}
