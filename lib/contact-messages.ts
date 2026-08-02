import { z } from 'zod';
import { ContactMessage } from '@/lib/types';

export const contactMessageInputSchema = z.object({
  name: z.string().trim().min(2, 'Lütfen geçerli bir ad soyad girin.').max(160),
  email: z.string().trim().email('Lütfen geçerli bir e-posta adresi girin.').max(320),
  subject: z.string().trim().min(1).max(200).optional().default('Genel İletişim'),
  phone: z.string().trim().max(64).optional().default(''),
  message: z.string().trim().min(5, 'Lütfen en az 5 karakterlik mesaj yazın.').max(10_000),
  website_hp: z.string().max(500).optional().default(''),
});

export type ContactMessageInput = z.infer<typeof contactMessageInputSchema>;

export interface ContactMessageRow {
  id: string;
  name: string;
  email: string;
  subject: string;
  phone: string | null;
  message: string;
  is_read: boolean;
  is_starred: boolean;
  ip_address: string | null;
  created_at: string;
}

export const CONTACT_MESSAGE_COLUMNS =
  'id,name,email,subject,phone,message,is_read,is_starred,ip_address,created_at';

export function mapContactMessage(row: ContactMessageRow): ContactMessage {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    phone: row.phone || '',
    message: row.message,
    isRead: row.is_read,
    isStarred: row.is_starred,
    ipAddress: row.ip_address || '',
    createdAt: row.created_at,
  };
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character] || character);
}
