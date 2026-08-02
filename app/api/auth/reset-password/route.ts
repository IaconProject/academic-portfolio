import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { sendOtpEmail } from '@/lib/email-service';
import { hashPassword } from '@/lib/auth-helpers';
import { checkRateLimit } from '@/lib/rate-limiter';
import {
  readAdminCredentials,
  writeAdminCredentials,
} from '@/lib/admin-credentials.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Server-side OTP memory store (Email -> { code, expiresAt, attempts })
const otpStore: Record<string, { code: string; expiresAt: number; attempts: number }> = {};

export async function POST(request: Request) {
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
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes valid

      otpStore[normalizedEmail] = {
        code,
        expiresAt,
        attempts: 0,
      };

      // Send OTP via Resend API
      const sent = await sendOtpEmail({ toEmail: normalizedEmail, otpCode: code });

      if (!sent) {
        delete otpStore[normalizedEmail];
        return NextResponse.json(
          { success: false, error: 'Doğrulama e-postası gönderilemedi. Lütfen kısa süre sonra tekrar deneyin.' },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `6 haneli doğrulama kodu ${normalizedEmail} adresine gönderildi. Lütfen e-posta gelen kutunuzu (ve Spam klasörünü) kontrol edin.`,
      });
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

      const record = otpStore[normalizedEmail];

      if (!record) {
        return NextResponse.json(
          { success: false, error: 'Aktif bir doğrulama kodu bulunamadı. Lütfen tekrar kod talep edin.' },
          { status: 400 }
        );
      }

      if (Date.now() > record.expiresAt) {
        delete otpStore[normalizedEmail];
        return NextResponse.json(
          { success: false, error: 'Doğrulama kodunun süresi dolmuş. Lütfen yeni kod talep edin.' },
          { status: 400 }
        );
      }

      record.attempts += 1;
      if (record.attempts > 3) {
        delete otpStore[normalizedEmail];
        return NextResponse.json(
          { success: false, error: 'Çok fazla hatalı kod denemesi yapıldı. Güvenlik nedeniyle işlem iptal edildi. Lütfen tekrar deneyin.' },
          { status: 429 }
        );
      }

      if (record.code !== (otpCode || '').trim()) {
        return NextResponse.json(
          { success: false, error: `Girdiğiniz doğrulama kodu hatalı. (${4 - record.attempts} hakkınız kaldı)` },
          { status: 400 }
        );
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
      delete otpStore[normalizedEmail];

      return NextResponse.json({
        success: true,
        message: 'Şifreniz güvenle güncellendi. Yeni şifrenizle giriş yapabilirsiniz.',
      });
    }

    return NextResponse.json({ success: false, error: 'Geçersiz işlem.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Şifre sıfırlama hatası.' }, { status: 500 });
  }
}
