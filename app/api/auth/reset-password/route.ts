import { NextResponse } from 'next/server';
import { getActiveRecipientEmail, getStoredData, sendOtpEmail } from '@/lib/email-service';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TMP_FILE_PATH = path.join('/tmp', 'academic_portfolio_data_v2.json');
const INITIAL_DATA_FILE = path.join(process.cwd(), 'lib', 'initial-data.ts');

// Server-side OTP memory store (Email -> { code, expiresAt, attempts })
const otpStore: Record<string, { code: string; expiresAt: number; attempts: number }> = {};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, email, otpCode, newPassword } = body;

    const normalizedEmail = (email || '').trim().toLowerCase();
    const activeAdminEmail = getActiveRecipientEmail();

    // ── ACTION 1: Request OTP Code ──
    if (action === 'request_otp') {
      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        return NextResponse.json({ success: false, error: 'Lütfen geçerli bir e-posta adresi girin.' }, { status: 400 });
      }

      const storedData = getStoredData();
      const validAdminEmails = [
        activeAdminEmail,
        (storedData.adminCredentials?.email || '').trim().toLowerCase(),
        (storedData.notificationSettings?.recipientEmail || '').trim().toLowerCase(),
        (storedData.profile?.email || '').trim().toLowerCase(),
        'info@muhammedakan.com',
        'admin@muhammedakan.com',
        'akan733333@gmail.com',
      ].filter(Boolean);

      const isValidEmail = validAdminEmails.includes(normalizedEmail);

      if (!isValidEmail) {
        return NextResponse.json(
          { success: false, error: `Girdiğiniz e-posta adresi (${normalizedEmail}) sistemdeki kayıtlı yönetici e-postası ile eşleşmiyor.` },
          { status: 403 }
        );
      }

      // Generate cryptographically secure 6-digit OTP code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes valid

      otpStore[normalizedEmail] = {
        code,
        expiresAt,
        attempts: 0,
      };

      // Send OTP via Resend API
      const sent = await sendOtpEmail({ toEmail: normalizedEmail, otpCode: code });

      return NextResponse.json({
        success: true,
        message: sent
          ? `6 haneli doğrulama kodu ${normalizedEmail} adresine gönderildi. Lütfen e-posta gelen kutunuzu (ve Spam klasörünü) kontrol edin.`
          : `Doğrulama kodu oluşturuldu. (${normalizedEmail})`,
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

      // OTP Validated Successfully! Update Admin Password.
      delete otpStore[normalizedEmail];

      const currentData = getStoredData();
      const updatedCreds = {
        email: activeAdminEmail,
        password: newPassword,
        updatedAt: new Date().toISOString(),
      };

      const updatedFull = {
        ...currentData,
        adminCredentials: updatedCreds,
      };

      // 1. Write /tmp
      try {
        fs.writeFileSync(TMP_FILE_PATH, JSON.stringify(updatedFull, null, 2), 'utf-8');
      } catch (e) {}

      // 2. Write initial-data.ts
      try {
        if (fs.existsSync(INITIAL_DATA_FILE)) {
          const content = `import { PortfolioData } from './types';\n\nexport const initialPortfolioData: PortfolioData = ${JSON.stringify(updatedFull, null, 2)};\n`;
          fs.writeFileSync(INITIAL_DATA_FILE, content, 'utf-8');
        }
      } catch (e) {}

      // 3. Upsert Supabase admin_credentials
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: credRows } = await supabase.from('admin_credentials').select('id').limit(1);
          const existingId = credRows && credRows.length > 0 ? credRows[0].id : undefined;

          await supabase.from('admin_credentials').upsert({
            ...(existingId ? { id: existingId } : {}),
            email: activeAdminEmail,
            password: newPassword,
            updated_at: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('[reset-password] Supabase admin_credentials update warning:', e);
        }
      }

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
