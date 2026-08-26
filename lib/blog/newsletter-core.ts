import { createHash, createHmac, randomBytes } from 'node:crypto';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeNewsletterEmail(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (normalized.length > 254 || !EMAIL_PATTERN.test(normalized)) return null;
  const separator = normalized.lastIndexOf('@');
  const local = normalized.slice(0, separator);
  const domain = normalized.slice(separator + 1);
  if (!local || local.length > 64 || !domain || domain.length > 253) return null;
  if (domain.split('.').some((label) => !label || label.length > 63)) {
    return null;
  }
  return normalized;
}

export function createNewsletterConfirmationToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashNewsletterToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function createNewsletterUnsubscribeToken(
  email: string,
  secret: string
): string {
  const normalized = normalizeNewsletterEmail(email);
  if (!normalized) throw new Error('INVALID_NEWSLETTER_EMAIL');
  if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('BLOG_NEWSLETTER_TOKEN_SECRET_TOO_SHORT');
  }
  return createHmac('sha256', secret)
    .update(`newsletter-unsubscribe:${normalized}`, 'utf8')
    .digest('base64url');
}

export function escapeNewsletterHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function emailShell({
  previewText,
  heading,
  body,
  footer,
}: {
  previewText: string;
  heading: string;
  body: string;
  footer: string;
}) {
  return `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeNewsletterHtml(heading)}</title>
    <style>
      body{margin:0;background:#f6f2e9;color:#292524;font-family:Arial,Helvetica,sans-serif}
      .preview{display:none!important;max-height:0;max-width:0;overflow:hidden;opacity:0;color:transparent}
      .wrap{width:100%;padding:32px 12px}
      .card{max-width:680px;margin:0 auto;overflow:hidden;border:1px solid #e7e5e4;border-radius:24px;background:#fff}
      .brand{padding:20px 28px;background:#1c1917;color:#fbbf24;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
      .main{padding:32px 28px;line-height:1.7}
      h1{margin:0 0 18px;font-size:30px;line-height:1.15;color:#1c1917}
      h2{margin:30px 0 12px;font-size:23px;line-height:1.25;color:#1c1917}
      h3,h4{margin:24px 0 10px;color:#292524}
      p{margin:0 0 16px} a{color:#a16207} img{max-width:100%;height:auto;border-radius:14px}
      blockquote{margin:22px 0;padding:14px 18px;border-left:4px solid #f59e0b;background:#fffbeb}
      pre{overflow:auto;padding:16px;border-radius:12px;background:#1c1917;color:#fafaf9}
      table{width:100%;border-collapse:collapse}th,td{padding:9px;border:1px solid #d6d3d1;text-align:left}
      .button{display:inline-block;margin:8px 0 16px;padding:13px 20px;border-radius:12px;background:#fbbf24;color:#1c1917!important;font-weight:800;text-decoration:none}
      .footer{padding:22px 28px;border-top:1px solid #e7e5e4;background:#fafaf9;color:#78716c;font-size:12px;line-height:1.6}
      .footer a{color:#57534e}
      @media(max-width:520px){.wrap{padding:0}.card{border-radius:0;border-left:0;border-right:0}.main{padding:26px 20px}.brand,.footer{padding-left:20px;padding-right:20px}h1{font-size:26px}}
    </style>
  </head>
  <body>
    <span class="preview">${escapeNewsletterHtml(previewText)}</span>
    <div class="wrap">
      <div class="card">
        <div class="brand">Muhammed Akan · Teknoloji Notları</div>
        <div class="main">
          <h1>${escapeNewsletterHtml(heading)}</h1>
          ${body}
        </div>
        <div class="footer">${footer}</div>
      </div>
    </div>
  </body>
</html>`;
}

export function buildNewsletterConfirmationMessage({
  confirmationUrl,
  privacyUrl,
}: {
  confirmationUrl: string;
  privacyUrl: string;
}) {
  const safeConfirmationUrl = escapeNewsletterHtml(confirmationUrl);
  const safePrivacyUrl = escapeNewsletterHtml(privacyUrl);
  const subject = 'Bülten kaydınızı doğrulayın';
  return {
    subject,
    text: [
      'Muhammed Akan Blog bültenine kaydınızı tamamlamak için aşağıdaki bağlantıyı açın:',
      confirmationUrl,
      '',
      'Bu bağlantı 48 saat geçerlidir. Bu isteği siz yapmadıysanız e-postayı yok sayabilirsiniz.',
      `Gizlilik: ${privacyUrl}`,
    ].join('\n'),
    html: emailShell({
      previewText: 'Bülten kaydınızı 48 saat içinde doğrulayın.',
      heading: 'E-posta adresinizi doğrulayın',
      body: `<p>Bitcoin, blok zinciri ve yapay zekâ üzerine yeni teknik yazıları almak için kaydınızı tamamlayın.</p><p><a class="button" href="${safeConfirmationUrl}">Kaydı doğrula</a></p><p>Bağlantı 48 saat geçerlidir. Bu isteği siz yapmadıysanız herhangi bir işlem yapmanız gerekmez.</p>`,
      footer: `Gizlilik yaklaşımımızı <a href="${safePrivacyUrl}">gizlilik sayfasında</a> inceleyebilirsiniz.`,
    }),
  };
}

export function buildNewsletterBroadcastMessage({
  title,
  previewText,
  contentHtml,
  contentText,
  unsubscribePageUrl,
  privacyUrl,
}: {
  title: string;
  previewText: string;
  contentHtml: string;
  contentText: string;
  unsubscribePageUrl: string;
  privacyUrl: string;
}) {
  const safeUnsubscribeUrl = escapeNewsletterHtml(unsubscribePageUrl);
  const safePrivacyUrl = escapeNewsletterHtml(privacyUrl);
  return {
    html: emailShell({
      previewText,
      heading: title,
      body: contentHtml,
      footer: `Bu e-posta Muhammed Akan Blog bültenine kaydolduğunuz için gönderildi. <a href="${safeUnsubscribeUrl}">Bülten aboneliğinden ayrılın</a> · <a href="${safePrivacyUrl}">Gizlilik</a>`,
    }),
    text: [
      title,
      '',
      contentText,
      '',
      `Bülten aboneliğinden ayrıl: ${unsubscribePageUrl}`,
      `Gizlilik: ${privacyUrl}`,
    ].join('\n'),
  };
}
