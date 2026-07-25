import { NextResponse } from 'next/server';
import { getActiveRecipientEmail, sendTestEmailDirect } from '@/lib/email-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const targetEmail = body.email
      ? String(body.email).trim().toLowerCase()
      : getActiveRecipientEmail();

    const result = await sendTestEmailDirect({ to: targetEmail });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({
      success: false,
      message: `Sunucu hatası: ${String(err)}`,
    });
  }
}

// GET endpoint for quick browser-based diagnostics
export async function GET() {
  const targetEmail = getActiveRecipientEmail();
  const result = await sendTestEmailDirect({ to: targetEmail });
  return NextResponse.json(result);
}
