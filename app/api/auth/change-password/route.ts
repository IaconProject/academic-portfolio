import { NextResponse } from 'next/server';
import { validateAdminSession, verifyPassword, hashPassword } from '@/lib/auth-helpers';
import {
  readAdminCredentials,
  writeAdminCredentials,
} from '@/lib/admin-credentials.server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. Session Auth Check
    const isAuthenticated = validateAdminSession(request);
    if (!isAuthenticated) {
      return NextResponse.json({ success: false, error: 'Yetkisiz erişim. Lütfen tekrar giriş yapın.' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newEmail, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, error: 'Mevcut şifre ve yeni şifre zorunludur.' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ success: false, error: 'Yeni şifre en az 8 karakter olmalıdır.' }, { status: 400 });
    }

    let credentials;
    try {
      credentials = await readAdminCredentials();
    } catch (error) {
      console.error('[change-password] credential read failed', error);
      return NextResponse.json(
        { success: false, error: 'Giriş bilgileri şu anda doğrulanamıyor.' },
        { status: 503 }
      );
    }

    // Verify current password
    const isCurrentValid = verifyPassword(currentPassword, credentials.password);
    if (!isCurrentValid) {
      return NextResponse.json({ success: false, error: 'Mevcut şifreniz hatalı. Lütfen kontrol edin.' }, { status: 400 });
    }

    // Hash the new password before storing
    const hashedNewPassword = hashPassword(newPassword);
    const updatedEmail = newEmail && newEmail.trim()
      ? newEmail.trim().toLowerCase()
      : credentials.email;

    try {
      await writeAdminCredentials({ email: updatedEmail, password: hashedNewPassword });
    } catch (error) {
      console.error('[change-password] credential write failed', error);
      return NextResponse.json(
        { success: false, error: 'Yeni şifre kalıcı olarak kaydedilemedi. Mevcut şifreniz değişmedi.' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      email: updatedEmail,
      message: 'Giriş bilgileriniz ve şifreniz güvenli bir şekilde güncellendi.',
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Şifre değiştirme sırasında bir hata oluştu.' }, { status: 500 });
  }
}
