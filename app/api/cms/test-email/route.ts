import { NextResponse } from 'next/server';
import { getActiveRecipientEmail, getStoredData, sendNotificationEmail, sendOtpEmail } from '@/lib/email-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const customRecipient = body.email ? String(body.email).trim().toLowerCase() : getActiveRecipientEmail();
    const data = getStoredData();
    const settings = data.notificationSettings;

    const resendKey = process.env.RESEND_API_KEY || settings?.resendApiKey;

    if (!resendKey) {
      return NextResponse.json({
        success: false,
        error: 'RESEND_API_KEY bulunamadı! Lütfen Vercel Environment Variables alanına veya CMS ayarlarına Resend API anahtarınızı ekleyin.',
      });
    }

    const testSubject = `🧪 Akademik Portfolyo E-posta Testi (${new Date().toLocaleTimeString('tr-TR')})`;
    const testHtml = `
      <div style="font-family: sans-serif; padding: 25px; background-color: #f7f5f0; color: #1c1917; max-width: 500px; margin: 0 auto; border-radius: 16px; border: 1px solid #e7e3d8;">
        <h2 style="color: #d97706; margin-top: 0;">🧪 E-posta Bildirim Testi Başarılı</h2>
        <p style="color: #57534e; font-size: 14px; line-height: 1.6;">
          Akademik Portfolyo CMS e-posta bildirim sisteminiz başarıyla çalışmaktadır.
        </p>
        <p style="color: #78716c; font-size: 12px; margin-bottom: 0;">
          Alıcı: <strong>${customRecipient}</strong><br />
          Tarih: ${new Date().toLocaleString('tr-TR')}
        </p>
      </div>
    `;

    // Try sending directly via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: [customRecipient],
        subject: testSubject,
        html: testHtml,
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (res.ok && json.id) {
      return NextResponse.json({
        success: true,
        message: `Test e-postası ${customRecipient} adresine başarıyla gönderildi! (Resend ID: ${json.id})`,
        resendResponse: json,
      });
    }

    // Handle 403 Unverified Domain Reroute Test
    if (json.statusCode === 403 || (json.message && json.message.includes('only send testing emails'))) {
      const match = json.message?.match(/to your own email address \(([^)]+)\)/i);
      const ownerEmail = match && match[1] ? match[1] : null;

      if (ownerEmail) {
        const retryRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'onboarding@resend.dev',
            to: [ownerEmail],
            subject: `[Test Maili -> ${customRecipient}] ${testSubject}`,
            html: testHtml,
          }),
        });

        const retryJson = await retryRes.json().catch(() => ({}));
        if (retryRes.ok && retryJson.id) {
          return NextResponse.json({
            success: true,
            rerouted: true,
            message: `Test maili Resend test modu kısıtlaması nedeniyle Resend hesap sahibiniz olan ${ownerEmail} adresine iletildi! (ID: ${retryJson.id})`,
            resendResponse: retryJson,
          });
        }
      }
    }

    return NextResponse.json({
      success: false,
      error: json.message || 'Resend API e-posta gönderimini reddetti.',
      resendResponse: json,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) });
  }
}
