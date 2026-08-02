import { NextResponse } from 'next/server';
import { z } from 'zod';
import { validateAdminSession } from '@/lib/auth-helpers';
import {
  contactMessageInputSchema,
  escapeHtml,
} from '@/lib/contact-messages';
import {
  MessageStoreError,
  createMessage,
  deleteMessage,
  deleteReadMessages,
  listMessages,
  markAllMessagesRead,
  updateMessage,
} from '@/lib/contact-messages.server';
import { sendNotificationEmail } from '@/lib/email-service';
import { checkRateLimit } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const updateSchema = z.object({
  id: z.string().uuid().optional(),
  isRead: z.boolean().optional(),
  isStarred: z.boolean().optional(),
  markAllRead: z.boolean().optional(),
});

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Robots-Tag': 'noindex',
    },
  });
}

function errorResponse(error: unknown) {
  if (error instanceof MessageStoreError) {
    return response(
      { success: false, error: { code: error.code, message: error.message } },
      error.status
    );
  }
  if (error instanceof z.ZodError) {
    return response(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.issues[0]?.message || 'Gönderilen bilgiler geçersiz.',
          fields: error.flatten().fieldErrors,
        },
      },
      400
    );
  }
  console.error('[messages] unexpected error', error);
  return response(
    {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Mesaj işlemi tamamlanamadı.' },
    },
    500
  );
}

function requireAdmin(request: Request) {
  if (!validateAdminSession(request)) {
    throw new MessageStoreError('Yetkisiz işlem.', 401, 'UNAUTHORIZED');
  }
}

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  ).slice(0, 128);
}

export async function GET(request: Request) {
  try {
    requireAdmin(request);
    const messages = await listMessages();
    return response({
      success: true,
      data: { messages, unreadCount: messages.filter((message) => !message.isRead).length },
      // Kept during the UI transition for older deployed clients.
      messages,
      unreadCount: messages.filter((message) => !message.isRead).length,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const quickLimit = checkRateLimit(`msg_${clientIp}`, 3, 60_000);
    if (!quickLimit.allowed) {
      throw new MessageStoreError(
        `Çok fazla mesaj gönderildi. Lütfen ${quickLimit.resetSeconds} saniye sonra tekrar deneyin.`,
        429,
        'RATE_LIMITED'
      );
    }

    const input = contactMessageInputSchema.parse(await request.json());
    if (input.website_hp) {
      return response({ success: true, message: 'Mesajınız iletildi.' });
    }

    // Persistence is the source of truth. No success response is returned before this completes.
    const newMessage = await createMessage(input, clientIp);
    const safe = {
      name: escapeHtml(newMessage.name),
      email: escapeHtml(newMessage.email),
      subject: escapeHtml(newMessage.subject),
      phone: escapeHtml(newMessage.phone || '-'),
      ip: escapeHtml(newMessage.ipAddress || '-'),
      message: escapeHtml(newMessage.message),
    };

    const notificationSent = await sendNotificationEmail({
      type: 'message',
      subject: `📩 Yeni İletişim Mesajı: ${newMessage.name} (${newMessage.subject})`,
      plainText: `Yeni ziyaretçi mesajı alındı.\nAd Soyad: ${newMessage.name}\nE-posta: ${newMessage.email}\nKonu: ${newMessage.subject}\nTelefon: ${newMessage.phone || '-'}\nMesaj:\n${newMessage.message}`,
      htmlText: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #f3efe6; color: #1c1917;">
          <h2 style="color: #d97706;">📩 Yeni Ziyaretçi Mesajı Alındı</h2>
          <p><strong>Gönderen:</strong> ${safe.name} (${safe.email})</p>
          <p><strong>Konu:</strong> ${safe.subject}</p>
          <p><strong>Telefon:</strong> ${safe.phone}</p>
          <p><strong>IP Adresi:</strong> ${safe.ip}</p>
          <hr style="border: none; border-top: 1px solid #e7e3d8; margin: 15px 0;" />
          <p style="white-space: pre-wrap; background: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #e7e3d8;">${safe.message}</p>
          <p style="font-size: 12px; color: #78716c; margin-top: 20px;">Bu bildirim Akademik Portfolyo CMS yönetim paneliniz tarafından gönderilmiştir.</p>
        </div>
      `,
    });

    console.info('[messages] message persisted', {
      id: newMessage.id,
      notificationSent,
    });
    return response({ success: true, data: newMessage, notificationSent }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    requireAdmin(request);
    const input = updateSchema.parse(await request.json());
    if (input.markAllRead) {
      await markAllMessagesRead();
      return response({ success: true });
    }
    if (!input.id) {
      throw new MessageStoreError('Mesaj ID zorunludur.', 400, 'VALIDATION_ERROR');
    }
    const message = await updateMessage(input.id, input);
    return response({ success: true, data: message });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    requireAdmin(request);
    const { searchParams } = new URL(request.url);
    if (searchParams.get('deleteRead') === 'true') {
      await deleteReadMessages();
      return response({ success: true });
    }

    const id = z.string().uuid().parse(searchParams.get('id'));
    await deleteMessage(id);
    return response({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
