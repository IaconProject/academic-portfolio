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

/**
 * Returns deduplicated list of all registered recipient emails.
 * Combines recipientEmails[] array + legacy recipientEmail field.
 */
export function getAllRecipientEmails(): string[] {
  const data = getStoredData();
  const ns = data.notificationSettings;
  const emails: string[] = [];

  // Primary: recipientEmails array
  if (ns?.recipientEmails && Array.isArray(ns.recipientEmails)) {
    ns.recipientEmails.forEach(e => {
      const clean = e.trim().toLowerCase();
      if (clean && clean.includes('@') && !emails.includes(clean)) {
        emails.push(clean);
      }
    });
  }

  // Fallback: legacy single recipientEmail
  if (emails.length === 0 && ns?.recipientEmail) {
    const clean = ns.recipientEmail.trim().toLowerCase();
    if (clean && clean.includes('@')) emails.push(clean);
  }

  // Fallback: profile email
  if (emails.length === 0 && data.profile?.email) {
    const clean = data.profile.email.trim().toLowerCase();
    if (clean && clean.includes('@')) emails.push(clean);
  }

  // Ultimate fallback
  if (emails.length === 0) emails.push('info@cedkan.com');

  return emails;
}

/** Legacy single-address helper (backward compat) */
export function getActiveRecipientEmail(): string {
  return getAllRecipientEmails()[0];
}

// ────────────────────────────────────────────────────────────
// Core Resend API sender with auto-reroute for test mode
// ────────────────────────────────────────────────────────────

interface ResendResult {
  success: boolean;
  id?: string;
  rerouted?: boolean;
  reroutedTo?: string;
  error?: string;
}

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
}): Promise<ResendResult> {
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

    console.log(`[Resend] Direct send to=${to} status=${res.status} body=${body.substring(0, 300)}`);

    if (res.ok && json.id) {
      return { success: true, id: json.id };
    }

    // Handle 403 test-mode restriction -> auto-reroute to account owner
    if (res.status === 403 || (json.message && json.message.includes('only send testing emails'))) {
      const match = (json.message || '').match(/to your own email address \(([^)]+)\)/i);
      const ownerEmail = match?.[1]?.trim();

      if (ownerEmail) {
        console.log(`[Resend] Test mode. Rerouting to account owner: ${ownerEmail}`);

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

        console.log(`[Resend] Reroute to=${ownerEmail} status=${retryRes.status} body=${retryBody.substring(0, 300)}`);

        if (retryRes.ok && retryJson.id) {
          return { success: true, id: retryJson.id, rerouted: true, reroutedTo: ownerEmail };
        }

        return { success: false, error: `Reroute failed: ${retryBody}` };
      }
    }

    return { success: false, error: `Resend error (${res.status}): ${body.substring(0, 200)}` };
  } catch (e: any) {
    console.error('[Resend] Network error:', e);
    return { success: false, error: e.message || String(e) };
  }
}

/**
 * Sends an email to ALL registered recipient emails.
 */
async function sendToAllRecipients({
  resendKey,
  subject,
  html,
  text,
  recipients,
}: {
  resendKey: string;
  subject: string;
  html: string;
  text: string;
  recipients: string[];
}): Promise<{ successes: string[]; failures: string[]; rerouted?: boolean; reroutedTo?: string }> {
  const successes: string[] = [];
  const failures: string[] = [];
  let rerouted = false;
  let reroutedTo: string | undefined;

  for (const email of recipients) {
    const result = await sendViaResend({ resendKey, to: email, subject, html, text });
    if (result.success) {
      successes.push(email);
      if (result.rerouted) {
        rerouted = true;
        reroutedTo = result.reroutedTo;
      }
    } else {
      failures.push(email);
      console.warn(`[Email] Failed for ${email}: ${result.error}`);
    }
  }

  return { successes, failures, rerouted, reroutedTo };
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

  if (!settings.emailNotificationsEnabled) {
    console.log(`[Email] Global notifications disabled. Skipping ${type}.`);
    return false;
  }

  if (type === 'message' && !settings.notifyOnNewMessage) {
    console.log('[Email] Message notifications disabled. Skipping.');
    return false;
  }
  if (type === 'visitor' && !settings.notifyOnNewVisitor) {
    console.log('[Email] Visitor notifications disabled. Skipping.');
    return false;
  }

  const recipients = getAllRecipientEmails();
  const resendKey = process.env.RESEND_API_KEY || settings.resendApiKey;

  if (!resendKey) {
    console.warn('[Email] No RESEND_API_KEY found. Cannot send.');
    return false;
  }

  console.log(`[Email] Sending ${type} notification to ${recipients.join(', ')}...`);

  const result = await sendToAllRecipients({
    resendKey,
    recipients,
    subject,
    html: htmlText,
    text: plainText,
  });

  console.log(`[Email] Results: ${result.successes.length} sent, ${result.failures.length} failed${result.rerouted ? ` (rerouted to ${result.reroutedTo})` : ''}`);

  return result.successes.length > 0;
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

  const result = await sendViaResend({ resendKey, to: toEmail, subject, html, text });

  if (result.success) {
    console.log(`[Email OTP] Sent OK. ID=${result.id}${result.rerouted ? ` (rerouted to ${result.reroutedTo})` : ''}`);
  } else {
    console.warn(`[Email OTP] Failed: ${result.error}`);
  }

  return result.success;
}

/**
 * Direct diagnostic send — bypasses CMS toggle checks.
 * Sends to ALL registered emails (or a custom list).
 */
export async function sendTestEmailDirect({ to }: { to?: string }): Promise<{
  success: boolean;
  message: string;
  results?: { successes: string[]; failures: string[] };
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

  // If a specific email is given, send only to that; otherwise send to all registered
  const recipients = to ? [to.trim().toLowerCase()] : getAllRecipientEmails();

  const now = new Date();
  const subject = `🧪 CMS E-posta Testi — ${now.toLocaleTimeString('tr-TR')}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 25px; background-color: #f7f5f0; color: #1c1917; max-width: 480px; margin: 0 auto; border-radius: 16px; border: 1px solid #e7e3d8;">
      <h2 style="color: #d97706; margin-top: 0;">🧪 E-posta Testi Başarılı!</h2>
      <p style="color: #57534e; font-size: 14px; line-height: 1.6;">
        Akademik Portfolyo CMS e-posta bildirim sistemi doğru çalışmaktadır.
      </p>
      <table style="font-size: 13px; color: #44403c; margin-top: 12px;">
        <tr><td style="padding-right: 12px; color: #78716c;">Alıcılar:</td><td><strong>${recipients.join(', ')}</strong></td></tr>
        <tr><td style="padding-right: 12px; color: #78716c;">Tarih:</td><td>${now.toLocaleString('tr-TR')}</td></tr>
      </table>
    </div>
  `;

  const result = await sendToAllRecipients({
    resendKey,
    recipients,
    subject,
    html,
    text: `CMS E-posta testi — Alıcılar: ${recipients.join(', ')}`,
  });

  if (result.successes.length > 0) {
    return {
      success: true,
      message: result.rerouted
        ? `Test e-postası Resend test modu nedeniyle ${result.reroutedTo} adresine yönlendirildi. (Hedefler: ${recipients.join(', ')})`
        : `Test e-postası başarıyla gönderildi: ${result.successes.join(', ')}`,
      results: result,
      rerouted: result.rerouted,
      reroutedTo: result.reroutedTo,
    };
  }

  return {
    success: false,
    message: `E-posta gönderilemedi. Başarısız adresler: ${result.failures.join(', ')}`,
    results: result,
  };
}
