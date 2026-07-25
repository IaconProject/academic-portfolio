import { PortfolioData } from './types';
import { initialPortfolioData } from './initial-data';
import fs from 'fs';
import path from 'path';

const TMP_FILE_PATH = path.join('/tmp', 'academic_portfolio_data_v2.json');

export function getStoredNotificationSettings() {
  try {
    if (fs.existsSync(TMP_FILE_PATH)) {
      const content = fs.readFileSync(TMP_FILE_PATH, 'utf-8');
      if (content) {
        const parsed = JSON.parse(content);
        if (parsed?.notificationSettings) {
          return parsed.notificationSettings;
        }
      }
    }
  } catch (e) {}
  return initialPortfolioData.notificationSettings!;
}

interface SendEmailParams {
  subject: string;
  htmlText: string;
  plainText: string;
  type: 'message' | 'visitor';
}

export async function sendNotificationEmail({ subject, htmlText, plainText, type }: SendEmailParams): Promise<boolean> {
  const settings = getStoredNotificationSettings();

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

  const recipient = settings.recipientEmail || 'info@cedkan.com';
  const resendKey = settings.resendApiKey || process.env.RESEND_API_KEY;

  console.log(`[Email Service] Sending ${type} notification to ${recipient}...`);

  // Option A: Send via Resend API if API Key is present
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

  // Option B: Log to Server Console & Session Store fallback (Clean notification log)
  console.log(`[Email Service Alert] To: ${recipient} | Subject: ${subject}`);
  return true;
}
