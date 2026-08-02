import { NextResponse } from 'next/server';
import { verifyPassword, createSessionToken } from '@/lib/auth-helpers';
import { checkRateLimit } from '@/lib/rate-limiter';
import { readAdminCredentials } from '@/lib/admin-credentials.server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    
    // Rate limit: Max 5 login attempts per 5 minutes per IP
    const rateCheck = checkRateLimit(`login_${clientIp}`, 5, 5 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Çok fazla hatalı giriş denemesi yapıldı. Lütfen ${rateCheck.resetSeconds} saniye sonra tekrar deneyin.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'E-posta ve şifre zorunludur.' }, { status: 400 });
    }

    const inputEmail = (email || '').trim().toLowerCase();

    let credentials;
    try {
      credentials = await readAdminCredentials();
    } catch (error) {
      console.error('[login] credential store unavailable', error);
      return NextResponse.json(
        { success: false, error: 'Giriş bilgileri şu anda doğrulanamıyor. Lütfen kısa süre sonra tekrar deneyin.' },
        { status: 503 }
      );
    }

    const storedEmail = credentials.email.trim().toLowerCase();
    const storedPassword = credentials.password;

    // Email match check
    const validEmails = [
      storedEmail,
      (process.env.CMS_ADMIN_EMAIL || '').trim().toLowerCase(),
    ].filter(Boolean);

    if (!validEmails.includes(inputEmail)) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz e-posta adresi veya şifre!' },
        { status: 401 }
      );
    }

    // Password match check
    const isPasswordValid = verifyPassword(password, storedPassword);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz e-posta adresi veya şifre!' },
        { status: 401 }
      );
    }

    // Successful login: Generate session token
    const token = createSessionToken(inputEmail);

    const response = NextResponse.json({
      success: true,
      token,
      email: inputEmail,
      message: 'Giriş başarılı. Yönlendiriliyorsunuz...',
    });

    // Set secure cookie
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    return response;
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Giriş işlemi sırasında sunucu hatası.' }, { status: 500 });
  }
}
