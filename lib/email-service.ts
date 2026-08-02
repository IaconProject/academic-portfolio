import { PortfolioData, NotificationSettings } from './types';
import { initialPortfolioData } from './initial-data';
import fs from 'fs';
import path from 'path';
import { hasSupabaseServiceRole, serverSupabase } from './supabase/server';

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

export function saveStoredData(data: PortfolioData): void {
  try {
    fs.writeFileSync(TMP_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed writing to tmp file:', e);
  }
}

/**
 * Returns the sender email address.
 * MUST use the verified domain to avoid Resend test-mode restrictions.
 */
export function getSenderEmail(): string {
  const data = getStoredData();
  return data.notificationSettings?.senderEmail || 'noreply@muhammedakan.com';
}

/**
 * Returns deduplicated list of all registered recipient emails.
 */
export function getAllRecipientEmails(): string[] {
  const data = getStoredData();
  const ns = data.notificationSettings;
  const emails: string[] = [];

  const envAdminEmail = process.env.CMS_ADMIN_EMAIL?.trim().toLowerCase();
  if (envAdminEmail && envAdminEmail.includes('@')) {
    emails.push(envAdminEmail);
  }

  if (ns?.recipientEmails && Array.isArray(ns.recipientEmails)) {
    ns.recipientEmails.forEach(e => {
      const clean = e.trim().toLowerCase();
      if (clean && clean.includes('@') && !emails.includes(clean)) {
        emails.push(clean);
      }
    });
  }

  if (emails.length === 0 && ns?.recipientEmail) {
    const clean = ns.recipientEmail.trim().toLowerCase();
    if (clean && clean.includes('@')) emails.push(clean);
  }

  if (emails.length === 0 && data.profile?.email) {
    const clean = data.profile.email.trim().toLowerCase();
    if (clean && clean.includes('@')) emails.push(clean);
  }

  if (emails.length === 0) emails.push('bilgi@muhammedakan.com');

  return emails;
}

export function getActiveRecipientEmail(): string {
  return getAllRecipientEmails()[0];
}

async function getPersistentNotificationSettings(): Promise<NotificationSettings> {
  const fallback = getStoredData().notificationSettings || initialPortfolioData.notificationSettings!;
  if (!serverSupabase || !hasSupabaseServiceRole) return fallback;

  const { data, error } = await serverSupabase
    .from('notification_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[Email] notification_settings could not be loaded', {
      code: error.code,
      message: error.message,
    });
    return fallback;
  }
  if (!data) return fallback;

  return {
    emailNotificationsEnabled: data.email_notifications_enabled ?? true,
    notifyOnNewMessage: data.notify_on_new_message ?? true,
    notifyOnNewVisitor: data.notify_on_new_visitor ?? false,
    recipientEmail: data.recipient_email || 'bilgi@muhammedakan.com',
    recipientEmails: data.recipient_emails || [data.recipient_email || 'bilgi@muhammedakan.com'],
    resendApiKey: data.resend_api_key || '',
    senderEmail: data.sender_email || 'noreply@muhammedakan.com',
  };
}

function recipientsFor(settings: NotificationSettings): string[] {
  const candidates = [
    process.env.CMS_ADMIN_EMAIL,
    ...(settings.recipientEmails || []),
    settings.recipientEmail,
  ];
  const recipients = candidates
    .map((email) => email?.trim().toLowerCase() || '')
    .filter((email) => email.includes('@'));
  return Array.from(new Set(recipients.length > 0 ? recipients : ['bilgi@muhammedakan.com']));
}

// ────────────────────────────────────────────────────────────
// Core Resend API sender
// ────────────────────────────────────────────────────────────

interface ResendResult {
  success: boolean;
  id?: string;
  error?: string;
}

async function sendViaResend({
  resendKey,
  from,
  to,
  subject,
  html,
  text,
}: {
  resendKey: string;
  from: string;
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
      body: JSON.stringify({ from, to: [to], subject, html, text: text || '' }),
    });

    const body = await res.text();
    let json: any = {};
    try { json = JSON.parse(body); } catch { json = { raw: body }; }

    console.log(`[Resend] to=${to} from=${from} status=${res.status} body=${body.substring(0, 300)}`);

    if (res.ok && json.id) {
      return { success: true, id: json.id };
    }

    return { success: false, error: `Resend ${res.status}: ${body.substring(0, 200)}` };
  } catch (e: any) {
    console.error('[Resend] Network error:', e);
    return { success: false, error: e.message || String(e) };
  }
}

async function sendToAllRecipients({
  resendKey,
  from,
  subject,
  html,
  text,
  recipients,
}: {
  resendKey: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  recipients: string[];
}): Promise<{ successes: string[]; failures: string[]; errors: string[] }> {
  const successes: string[] = [];
  const failures: string[] = [];
  const errors: string[] = [];

  for (const email of recipients) {
    const result = await sendViaResend({ resendKey, from, to: email, subject, html, text });
    if (result.success) {
      successes.push(email);
    } else {
      failures.push(email);
      errors.push(`${email}: ${result.error}`);
    }
  }

  return { successes, failures, errors };
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
  const settings = await getPersistentNotificationSettings();

  if (!settings.emailNotificationsEnabled) {
    console.log(`[Email] Global notifications disabled. Skipping ${type}.`);
    return false;
  }
  if (type === 'message' && !settings.notifyOnNewMessage) {
    console.log('[Email] Message notifications disabled.');
    return false;
  }
  if (type === 'visitor' && !settings.notifyOnNewVisitor) {
    console.log('[Email] Visitor notifications disabled.');
    return false;
  }

  const recipients = recipientsFor(settings);
  const resendKey = process.env.RESEND_API_KEY || settings.resendApiKey;
  const from = settings.senderEmail || 'noreply@muhammedakan.com';

  if (!resendKey) {
    console.warn('[Email] No RESEND_API_KEY found.');
    return false;
  }

  console.log(`[Email] Sending ${type} from=${from} to=${recipients.join(', ')}...`);

  const result = await sendToAllRecipients({ resendKey, from, recipients, subject, html: htmlText, text: plainText });

  console.log(`[Email] ${result.successes.length} sent, ${result.failures.length} failed`);
  if (result.errors.length > 0) console.warn('[Email] Errors:', result.errors.join(' | '));

  return result.successes.length > 0;
}

export async function sendOtpEmail({ toEmail, otpCode }: { toEmail: string; otpCode: string }): Promise<boolean> {
  const settings = await getPersistentNotificationSettings();
  const resendKey = process.env.RESEND_API_KEY || settings.resendApiKey;
  if (!resendKey) {
    console.warn('[Email OTP] No RESEND_API_KEY found in ENV or CMS Settings.');
    return false;
  }

  const from = settings.senderEmail || 'noreply@muhammedakan.com';
  const subject = `🔑 Şifre Sıfırlama Kodu: ${otpCode}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 30px; background-color: #f3efe6; color: #1c1917; max-width: 480px; margin: 0 auto; border-radius: 16px; border: 1px solid #e7e3d8;">
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

  console.log(`[Email OTP] from=${from} to=${toEmail}...`);
  const result = await sendViaResend({ resendKey, from, to: toEmail, subject, html, text: `Kod: ${otpCode}` });

  if (result.success) {
    console.log(`[Email OTP] Sent OK. ID=${result.id}`);
  } else {
    console.warn(`[Email OTP] Failed: ${result.error}`);
  }

  return result.success;
}

export async function sendTestEmailDirect({ to }: { to?: string }): Promise<{
  success: boolean;
  message: string;
  results?: { successes: string[]; failures: string[]; errors: string[] };
  debug?: any;
}> {
  const settings = await getPersistentNotificationSettings();
  const resendKey = process.env.RESEND_API_KEY || settings.resendApiKey;
  const from = settings.senderEmail || 'noreply@muhammedakan.com';

  if (!resendKey) {
    return {
      success: false,
      message: 'RESEND_API_KEY bulunamadı. Vercel veya .env.local dosyasına ekleyin.',
      debug: {
        envKeyExists: !!process.env.RESEND_API_KEY,
        cmsKeyExists: !!settings.resendApiKey,
      },
    };
  }

  const recipients = to ? [to.trim().toLowerCase()] : recipientsFor(settings);
  const now = new Date();
  const subject = `🧪 CMS E-posta Testi — ${now.toLocaleTimeString('tr-TR')}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 25px; background-color: #f3efe6; color: #1c1917; max-width: 480px; margin: 0 auto; border-radius: 16px; border: 1px solid #e7e3d8;">
      <h2 style="color: #d97706; margin-top: 0;">🧪 E-posta Testi Başarılı!</h2>
      <p style="color: #57534e; font-size: 14px; line-height: 1.6;">CMS e-posta bildirimleri doğru çalışmaktadır.</p>
      <table style="font-size: 13px; color: #44403c; margin-top: 12px;">
        <tr><td style="padding-right: 12px; color: #78716c;">Gönderen:</td><td><strong>${from}</strong></td></tr>
        <tr><td style="padding-right: 12px; color: #78716c;">Alıcılar:</td><td><strong>${recipients.join(', ')}</strong></td></tr>
        <tr><td style="padding-right: 12px; color: #78716c;">Tarih:</td><td>${now.toLocaleString('tr-TR')}</td></tr>
      </table>
    </div>
  `;

  const result = await sendToAllRecipients({
    resendKey, from, recipients, subject, html,
    text: `CMS Test — Gönderen: ${from} — Alıcılar: ${recipients.join(', ')}`,
  });

  if (result.successes.length > 0) {
    return {
      success: true,
      message: `Test e-postası gönderildi: ${result.successes.join(', ')} (Gönderen: ${from})`,
      results: result,
    };
  }

  return {
    success: false,
    message: `E-posta gönderilemedi. Hatalar: ${result.errors.join(' | ')}`,
    results: result,
    debug: { from, recipients, resendKeyPrefix: resendKey.substring(0, 8) },
  };
}
