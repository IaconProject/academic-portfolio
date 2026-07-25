import { NextResponse } from 'next/server';
import { sendTestEmailDirect } from '@/lib/email-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    // If email provided, send to that specific address; otherwise send to all registered
    const result = await sendTestEmailDirect({ to: body.email || undefined });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ success: false, message: `Sunucu hatası: ${String(err)}` });
  }
}

export async function GET() {
  const result = await sendTestEmailDirect({});
  return NextResponse.json(result);
}
