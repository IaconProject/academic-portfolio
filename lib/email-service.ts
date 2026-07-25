import { PortfolioData } from './types';
import { initialPortfolioData } from './initial-data';
import fs from 'fs';
import path from 'path';

const TMP_FILE_PATH = path.join('/tmp', 'academic_portfolio_data_v2.json');

export function getStoredData(): PortfolioData {
  try {
    if (fs.existsSync(TMP_FILE_PATH)) {
      const content = fs.readFileSync(TMP_FILE_PATH, 'utf-8');
      if (content) {
        const parsed = JSON.parse(content);
        if (parsed && parsed.profile) {
          return parsed;
        }
      }
    }
  } catch (e) {}
  return initialPortfolioData;
}

export function getActiveRecipientEmail(): string {
  const data = getStoredData();
  return (
    data.adminCredentials?.email ||
    data.notificationSettings?.recipientEmail ||
    data.profile?.email ||
    'info@cedkan.com'
  ).trim().toLowerCase();
}

/**
 * Core Resend API sender with auto-reroute for test mode (unverified domain).
 * Resend free tier only allows sending to the account owner email.
 * When a 403 is returned, we parse the owner email from the error and retry.
 */
async function sendViaResend({
  resendKey,
  to,
  subject,
  html,
  text,
}: {
  resendKey: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ success: boolean; id?: string; rerouted?: boolean; reroutedTo?: string; error?: string }> {
  // Step 1: Try direct send
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: [to],
        subject,
        html,
        text: text || '',
      }),
    });

    const body = await res.text();
    let json: any = {};
    try { json = JSON.parse(body); } catch { json = { raw: body }; }

    console.log(`[Resend] Direct send to=${to} status=${res.status} body=${body}`);

    if (res.ok && json.id) {
      return { success: true, id: json.id };
    }

    // Step 2: Handle 403 test-mode restriction -> auto-reroute to account owner
    if (res.status === 403 || (json.message && json.message.includes('only send testing emails'))) {
      const match = (json.message || '').match(/to your own email address \(([^)]+)\)/i);
      const ownerEmail = match?.[1]?.trim();

      if (ownerEmail) {
        console.log(`[Resend] Test mode detected. Rerouting to account owner: ${ownerEmail}`);

        const retryRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'onboarding@resend.dev',
            to: [ownerEmail],
            subject: `[→ ${to}] ${subject}`,
            html,
            text: text || '',
          }),
        });

        const retryBody = await retryRes.text();
        let retryJson: any = {};
        try { retryJson = JSON.parse(retryBody); } catch { retryJson = { raw: retryBody }; }

        console.log(`[Resend] Reroute to=${ownerEmail} status=${retryRes.status} body=${retryBody}`);

        if (retryRes.ok && retryJson.id) {
          return { success: true, id: retryJson.id, rerouted: true, reroutedTo: ownerEmail };
        }

        return { success: false, error: `Reroute failed: ${retryBody}` };
      }
    }

    return { success: false, error: `Resend error: ${body}` };
  } catch (e: any) {
    console.error('[Resend] Network/fetch error:', e);
    return { success: false, error: e.message || String(e) };
  }
}

// ────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────

interface SendEmailParams {
  subject: string;
  htmlText: string;
  plainText: string;
  type: 'message' | 'visitor';
}

export async function sendNotificationEmail({ subject, htmlText, plainText, type }: SendEmailParams): Promise<boolean> {
  const data = getStoredData();
  const settings = data.notificationSettings || initialPortfolioData.notificationSettings!;

  // Check global toggle
  if (!settings.emailNotificationsEnabled) {
    console.log(`[Email] Global notifications disabled. Skipping ${type}.`);
    return false;
  }

  // Check per-event toggle
  if (type === 'message' && !settings.notifyOnNewMessage) {
    console.log('[Email] Message notifications disabled. Skipping.');
    return false;
  }
  if (type === 'visitor' && !settings.notifyOnNewVisitor) {
    console.log('[Email] Visitor notifications disabled. Skipping.');
    return false;
  }

  const recipient = getActiveRecipientEmail();
  const resendKey = process.env.RESEND_API_KEY || settings.resendApiKey;

  if (!resendKey) {
    console.warn('[Email] No RESEND_API_KEY found. Cannot send.');
    return false;
  }

  console.log(`[Email] Sending ${type} notification to ${recipient}...`);

  const result = await sendViaResend({
    resendKey,
    to: recipient,
    subject,
    html: htmlText,
    text: plainText,
  });

  if (result.success) {
    console.log(`[Email] Sent OK. ID=${result.id}${result.rerouted ? ` (rerouted to ${result.reroutedTo})` : ''}`);
  } else {
    console.warn(`[Email] Send failed: ${result.error}`);
  }

  return result.success;
}

export async function sendOtpEmail({ toEmail, otpCode }: { toEmail: string; otpCode: string }): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn('[Email OTP] No RESEND_API_KEY. Cannot send OTP.');
    return false;
  }

  const subject = `🔑 Şifre Sıfırlama Kodu: ${otpCode}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 30px; background-color: #f7f5f0; color: #1c1917; max-width: 480px; margin: 0 auto; border-radius: 16px; border: 1px solid #e7e3d8;">
      <h2 style="color: #1c1917; margin-top: 0; font-size: 20px;">🔑 Şifre Sıfırlama Doğrulaması</h2>
      <p style="color: #57534e; font-size: 14px; line-height: 1.6;">
        Yönetim paneli şifrenizi sıfırlamak için tek kullanımlık doğrulama kodunuz:
      </p>
      <div style="background-color: #ffffff; padding: 18px 24px; border-radius: 12px; border: 2px solid #d97706; text-align: center; margin: 24px 0;">
        <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #d97706;">${otpCode}</span>
      </div>
      <p style="color: #78716c; font-size: 12px; margin-bottom: 0;">
        Bu kod <strong>10 dakika</strong> geçerlidir. Talebi siz yapmadıysanız bu e-postayı yoksayın.
      </p>
    </div>
  `;

  const text = `Şifre Sıfırlama Kodu: ${otpCode} — 10 dakika geçerli.`;

  console.log(`[Email OTP] Sending OTP to ${toEmail}...`);

  const result = await sendViaResend({
    resendKey,
    to: toEmail,
    subject,
    html,
    text,
  });

  if (result.success) {
    console.log(`[Email OTP] Sent OK. ID=${result.id}${result.rerouted ? ` (rerouted to ${result.reroutedTo})` : ''}`);
  } else {
    console.warn(`[Email OTP] Send failed: ${result.error}`);
  }

  return result.success;
}

/**
 * Direct diagnostic send — bypasses CMS toggle checks.
 * Used by /api/cms/test-email endpoint.
 */
export async function sendTestEmailDirect({ to }: { to: string }): Promise<{
  success: boolean;
  message: string;
  resendId?: string;
  rerouted?: boolean;
  reroutedTo?: string;
  debug?: any;
}> {
  const data = getStoredData();
  const resendKey = process.env.RESEND_API_KEY || data.notificationSettings?.resendApiKey;

  if (!resendKey) {
    return {
      success: false,
      message: 'RESEND_API_KEY ortam değişkeni bulunamadı. Vercel Environment Variables paneline veya .env.local dosyasına ekleyin.',
      debug: {
        envKeyExists: !!process.env.RESEND_API_KEY,
        cmsKeyExists: !!data.notificationSettings?.resendApiKey,
        envKeys: Object.keys(process.env).filter(k => k.includes('RESEND')),
      },
    };
  }

  const now = new Date();
  const subject = `🧪 CMS E-posta Testi — ${now.toLocaleTimeString('tr-TR')}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 25px; background-color: #f7f5f0; color: #1c1917; max-width: 480px; margin: 0 auto; border-radius: 16px; border: 1px solid #e7e3d8;">
      <h2 style="color: #d97706; margin-top: 0;">🧪 E-posta Testi Başarılı!</h2>
      <p style="color: #57534e; font-size: 14px; line-height: 1.6;">
        Akademik Portfolyo CMS e-posta bildirim sistemi doğru çalışmaktadır.
      </p>
      <table style="font-size: 13px; color: #44403c; margin-top: 12px;">
        <tr><td style="padding-right: 12px; color: #78716c;">Alıcı:</td><td><strong>${to}</strong></td></tr>
        <tr><td style="padding-right: 12px; color: #78716c;">Tarih:</td><td>${now.toLocaleString('tr-TR')}</td></tr>
        <tr><td style="padding-right: 12px; color: #78716c;">API Key:</td><td>${resendKey.substring(0, 8)}...${resendKey.substring(resendKey.length - 4)}</td></tr>
      </table>
    </div>
  `;

  const result = await sendViaResend({
    resendKey,
    to,
    subject,
    html,
    text: `CMS E-posta testi — Alıcı: ${to}`,
  });

  if (result.success) {
    const target = result.rerouted ? result.reroutedTo : to;
    return {
      success: true,
      message: result.rerouted
        ? `Test e-postası Resend test modu kısıtlaması nedeniyle ${target} adresine yönlendirildi. (ID: ${result.id})`
        : `Test e-postası ${to} adresine başarıyla gönderildi. (ID: ${result.id})`,
      resendId: result.id,
      rerouted: result.rerouted,
      reroutedTo: result.reroutedTo,
    };
  }

  return {
    success: false,
    message: `E-posta gönderilemedi: ${result.error}`,
    debug: {
      resendKeyPrefix: resendKey.substring(0, 8),
      targetEmail: to,
      error: result.error,
    },
  };
}
