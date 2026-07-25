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

interface SendEmailParams {
  subject: string;
  htmlText: string;
  plainText: string;
  type: 'message' | 'visitor';
}

export async function sendNotificationEmail({ subject, htmlText, plainText, type }: SendEmailParams): Promise<boolean> {
  const data = getStoredData();
  const settings = data.notificationSettings || initialPortfolioData.notificationSettings!;

  // 1. Check general email notifications toggle
  if (!settings.emailNotificationsEnabled) {
    console.log(`[Email Service] Global email notifications disabled. Skipping ${type} notification.`);
    return false;
  }

  // 2. Check specific event toggle
  if (type === 'message' && !settings.notifyOnNewMessage) {
    console.log('[Email Service] Visitor message email notifications disabled in CMS. Skipping.');
    return false;
  }

  if (type === 'visitor' && !settings.notifyOnNewVisitor) {
    console.log('[Email Service] Visitor session email notifications disabled in CMS. Skipping.');
    return false;
  }

  const recipient = getActiveRecipientEmail();
  const resendKey = process.env.RESEND_API_KEY || settings.resendApiKey;

  console.log(`[Email Service] Sending ${type} notification to ${recipient}...`);

  if (resendKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Akademik Portfolyo CMS <onboarding@resend.dev>',
          to: [recipient],
          subject: subject,
          html: htmlText,
          text: plainText,
        }),
      });

      if (res.ok) {
        console.log(`[Email Service] Notification sent successfully via Resend API to ${recipient}`);
        return true;
      } else {
        const errorJson = await res.json().catch(() => ({}));
        console.warn('[Email Service] Resend API error response:', errorJson);
      }
    } catch (e) {
      console.warn('[Email Service] Failed to send via Resend API:', e);
    }
  }

  console.log(`[Email Service Fallback Alert] To: ${recipient} | Subject: ${subject}`);
  return true;
}

export async function sendOtpEmail({ toEmail, otpCode }: { toEmail: string; otpCode: string }): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  const subject = `🔑 Şifre Sıfırlama Doğrulama Kodu: ${otpCode}`;

  const htmlText = `
    <div style="font-family: sans-serif; padding: 25px; background-color: #f7f5f0; color: #1c1917; max-width: 500px; margin: 0 auto; border-radius: 16px; border: 1px solid #e7e3d8;">
      <h2 style="color: #1c1917; margin-top: 0;">🔑 Güvenli Şifre Sıfırlama</h2>
      <p style="color: #57534e; font-size: 14px; leading-height: 1.6;">
        Yönetim paneli şifrenizi sıfırlama talebinde bulundunuz. Tek kullanımlık doğrulama kodunuz aşağıdadır:
      </p>
      <div style="background-color: #ffffff; padding: 15px 25px; border-radius: 12px; border: 2px border #d97706; text-align: center; margin: 20px 0;">
        <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #d97706;">${otpCode}</span>
      </div>
      <p style="color: #78716c; font-size: 12px; margin-bottom: 0;">
        Bu kod <strong>10 dakika</strong> boyunca geçerlidir. Eğer bu talebi siz yapmadıysanız lütfen bu e-postayı dikkate almayın.
      </p>
    </div>
  `;

  const plainText = `Şifre Sıfırlama Doğrulama Kodu: ${otpCode}\nBu kod 10 dakika boyunca geçerlidir.`;

  if (resendKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Akademik Portfolyo Güvenlik <onboarding@resend.dev>',
          to: [toEmail],
          subject: subject,
          html: htmlText,
          text: plainText,
        }),
      });

      if (res.ok) {
        console.log(`[Email Service] OTP code sent successfully via Resend API to ${toEmail}`);
        return true;
      }
    } catch (e) {
      console.warn('[Email Service] Failed sending OTP via Resend API:', e);
    }
  }

  console.log(`[Email Service OTP Fallback Log] To: ${toEmail} | OTP: ${otpCode}`);
  return true;
}
