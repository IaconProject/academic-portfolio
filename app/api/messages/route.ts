import { NextResponse } from 'next/server';
import {
  serverSupabase as supabase,
  isServerSupabaseConfigured as isSupabaseConfigured,
} from '@/lib/supabase/server';
import { ContactMessage } from '@/lib/types';
import { sendNotificationEmail } from '@/lib/email-service';
import { validateAdminSession } from '@/lib/auth-helpers';
import { checkRateLimit } from '@/lib/rate-limiter';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MESSAGES_TMP_FILE = path.join('/tmp', 'academic_contact_messages_v1.json');

let memoryMessages: ContactMessage[] = [];

function readLocalMessages(): ContactMessage[] {
  if (memoryMessages.length > 0) return memoryMessages;
  try {
    if (fs.existsSync(MESSAGES_TMP_FILE)) {
      const content = fs.readFileSync(MESSAGES_TMP_FILE, 'utf-8');
      if (content) {
        memoryMessages = JSON.parse(content);
        return memoryMessages;
      }
    }
  } catch (e) {
    console.error('Failed reading local messages file:', e);
  }
  return [];
}

function writeLocalMessages(msgs: ContactMessage[]): void {
  memoryMessages = msgs;
  try {
    fs.writeFileSync(MESSAGES_TMP_FILE, JSON.stringify(msgs, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed writing local messages file:', e);
  }
}

// GET: List all messages with unread count
export async function GET(request: Request) {
  if (!validateAdminSession(request)) {
    return NextResponse.json({ success: false, error: 'Yetkisiz işlem.' }, { status: 401 });
  }
  let messages: ContactMessage[] = [];

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        messages = data.map((row: any) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          subject: row.subject,
          phone: row.phone || '',
          message: row.message,
          isRead: row.is_read ?? false,
          isStarred: row.is_starred ?? false,
          ipAddress: row.ip_address || '',
          createdAt: row.created_at,
        }));
        writeLocalMessages(messages);
      } else {
        messages = readLocalMessages();
      }
    } catch (e) {
      messages = readLocalMessages();
    }
  } else {
    messages = readLocalMessages();
  }

  const unreadCount = messages.filter((m) => !m.isRead).length;

  return NextResponse.json({
    success: true,
    unreadCount,
    messages,
  });
}

// POST: Submit a new visitor message
export async function POST(request: Request) {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';

    // Rate Limit: 3 messages per minute per IP
    const rateCheck = checkRateLimit(`msg_${clientIp}`, 3, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Çok fazla mesaj gönderildi. Lütfen ${rateCheck.resetSeconds} saniye sonra tekrar deneyin.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { name, email, subject, phone, message, website_hp } = body;

    // 1. Anti-spam Honeypot Protection
    if (website_hp) {
      // Spam bot filled hidden honeypot field -> silent fail
      return NextResponse.json({ success: true, message: 'Mesajınız iletildi.' });
    }

    // 2. Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Lütfen geçerli bir ad soyad girin.' }, { status: 400 });
    }

    if (!email || !email.includes('@') || !email.includes('.')) {
      return NextResponse.json({ success: false, error: 'Lütfen geçerli bir e-posta adresi girin.' }, { status: 400 });
    }

    if (!message || typeof message !== 'string' || message.trim().length < 5) {
      return NextResponse.json({ success: false, error: 'Lütfen en az 5 karakterlik mesaj yazın.' }, { status: 400 });
    }

    const newMessage: ContactMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: (subject || 'Genel İletişim').trim(),
      phone: (phone || '').trim(),
      message: message.trim(),
      isRead: false,
      isStarred: false,
      ipAddress: clientIp,
      createdAt: new Date().toISOString(),
    };

    // Save locally
    const current = readLocalMessages();
    const updated = [newMessage, ...current];
    writeLocalMessages(updated);

    // Save to Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('contact_messages').insert({
          name: newMessage.name,
          email: newMessage.email,
          subject: newMessage.subject,
          phone: newMessage.phone,
          message: newMessage.message,
          is_read: false,
          is_starred: false,
          ip_address: newMessage.ipAddress,
        });
      } catch (e) {
        console.warn('Supabase message insert error:', e);
      }
    }

    // Trigger email notification asynchronously
    sendNotificationEmail({
      type: 'message',
      subject: `📩 Yeni İletişim Mesajı: ${newMessage.name} (${newMessage.subject})`,
      plainText: `Yeni ziyaretçi mesajı alındı.\nAd Soyad: ${newMessage.name}\nE-posta: ${newMessage.email}\nKonu: ${newMessage.subject}\nTelefon: ${newMessage.phone || '-'}\nMesaj:\n${newMessage.message}`,
      htmlText: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #f3efe6; color: #1c1917;">
          <h2 style="color: #d97706;">📩 Yeni Ziyaretçi Mesajı Alındı</h2>
          <p><strong>Gönderen:</strong> ${newMessage.name} (${newMessage.email})</p>
          <p><strong>Konu:</strong> ${newMessage.subject}</p>
          <p><strong>Telefon:</strong> ${newMessage.phone || '-'}</p>
          <p><strong>IP Adresi:</strong> ${newMessage.ipAddress}</p>
          <hr style="border: none; border-top: 1px solid #e7e3d8; margin: 15px 0;" />
          <p style="white-space: pre-wrap; background: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #e7e3d8;">${newMessage.message}</p>
          <p style="font-size: 12px; color: #78716c; margin-top: 20px;">Bu bildirim Akademik Portfolyo CMS yönetim paneliniz tarafından gönderilmiştir.</p>
        </div>
      `,
    }).catch(() => {});

    return NextResponse.json({ success: true, data: newMessage });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Mesaj iletilirken bir hata oluştu.' }, { status: 500 });
  }
}

// PATCH: Update isRead or isStarred status (Requires Admin Auth)
export async function PATCH(request: Request) {
  try {
    if (!validateAdminSession(request)) {
      return NextResponse.json({ success: false, error: 'Yetkisiz işlem.' }, { status: 401 });
    }

    const { id, isRead, isStarred, markAllRead } = await request.json();
    let current = readLocalMessages();

    if (markAllRead) {
      current = current.map((m) => ({ ...m, isRead: true }));
      writeLocalMessages(current);

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('contact_messages').update({ is_read: true }).neq('id', '00000000-0000-0000-0000-000000000000');
        } catch (e) {}
      }

      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Mesaj ID zorunludur.' }, { status: 400 });
    }

    current = current.map((m) => {
      if (m.id === id) {
        return {
          ...m,
          ...(typeof isRead === 'boolean' ? { isRead } : {}),
          ...(typeof isStarred === 'boolean' ? { isStarred } : {}),
        };
      }
      return m;
    });

    writeLocalMessages(current);

    if (isSupabaseConfigured && supabase) {
      try {
        const updatePayload: any = {};
        if (typeof isRead === 'boolean') updatePayload.is_read = isRead;
        if (typeof isStarred === 'boolean') updatePayload.is_starred = isStarred;

        await supabase.from('contact_messages').update(updatePayload).eq('id', id);
      } catch (e) {}
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

// DELETE: Delete single message or read messages (Requires Admin Auth)
export async function DELETE(request: Request) {
  try {
    if (!validateAdminSession(request)) {
      return NextResponse.json({ success: false, error: 'Yetkisiz işlem.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const deleteRead = searchParams.get('deleteRead');

    let current = readLocalMessages();

    if (deleteRead === 'true') {
      current = current.filter((m) => !m.isRead);
      writeLocalMessages(current);

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('contact_messages').delete().eq('is_read', true);
        } catch (e) {}
      }

      return NextResponse.json({ success: true });
    }

    if (id) {
      current = current.filter((m) => m.id !== id);
      writeLocalMessages(current);

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('contact_messages').delete().eq('id', id);
        } catch (e) {}
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Parametre eksik.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
