import { NextResponse } from 'next/server';
import {
  serverSupabase as supabase,
  isServerSupabaseConfigured as isSupabaseConfigured,
} from '@/lib/supabase/server';
import { validateAdminSession, verifyPassword, hashPassword } from '@/lib/auth-helpers';
import { getStoredData, saveStoredData } from '@/lib/email-service';

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

    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, error: 'Yeni şifre en az 6 karakter olmalıdır.' }, { status: 400 });
    }

    // Fetch existing stored credentials
    let storedEmail = 'bilgi@muhammedakan.com';
    let storedPassword = '';

    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase.from('admin_credentials').select('*').limit(1);
        if (data && data.length > 0) {
          storedEmail = data[0].email || storedEmail;
          storedPassword = data[0].password || '';
        }
      } catch (e) {
        console.warn('[Change Password] Supabase fetch error:', e);
      }
    }

    if (!storedPassword) {
      const localData = getStoredData();
      storedEmail = localData.adminCredentials?.email || storedEmail;
      storedPassword = localData.adminCredentials?.password || 'admin123456';
    }

    // Verify current password
    const isCurrentValid = verifyPassword(currentPassword, storedPassword);
    if (!isCurrentValid) {
      return NextResponse.json({ success: false, error: 'Mevcut şifreniz hatalı. Lütfen kontrol edin.' }, { status: 400 });
    }

    // Hash the new password before storing
    const hashedNewPassword = hashPassword(newPassword);
    const updatedEmail = newEmail && newEmail.trim() ? newEmail.trim().toLowerCase() : storedEmail;

    // Update local storage
    const localData = getStoredData();
    const updatedCreds = {
      email: updatedEmail,
      password: hashedNewPassword,
      updatedAt: new Date().toISOString(),
    };
    localData.adminCredentials = updatedCreds;
    saveStoredData(localData);

    // Update Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: credRows } = await supabase.from('admin_credentials').select('id').limit(1);
        const existingId = credRows && credRows.length > 0 ? credRows[0].id : undefined;

        await supabase.from('admin_credentials').upsert({
          ...(existingId ? { id: existingId } : {}),
          email: updatedEmail,
          password: hashedNewPassword,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('[Change Password] Supabase upsert error:', e);
      }
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
