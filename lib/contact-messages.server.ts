import 'server-only';
import { PostgrestError } from '@supabase/supabase-js';
import {
  CONTACT_MESSAGE_COLUMNS,
  ContactMessageInput,
  ContactMessageRow,
  mapContactMessage,
} from '@/lib/contact-messages';
import { ContactMessage } from '@/lib/types';
import { hasSupabaseServiceRole, serverSupabase } from '@/lib/supabase/server';

export class MessageStoreError extends Error {
  constructor(
    message: string,
    public readonly status = 503,
    public readonly code = 'MESSAGE_STORE_UNAVAILABLE'
  ) {
    super(message);
  }
}

function client() {
  if (!serverSupabase || !hasSupabaseServiceRole) {
    throw new MessageStoreError(
      'Mesaj veritabanı bağlantısı yapılandırılmamış. SUPABASE_SERVICE_ROLE_KEY kontrol edilmelidir.'
    );
  }
  return serverSupabase;
}

function throwDatabaseError(action: string, error: PostgrestError): never {
  console.error(`[messages] ${action} failed`, {
    code: error.code,
    message: error.message,
    details: error.details,
  });
  throw new MessageStoreError(`Mesaj veritabanında ${action} işlemi tamamlanamadı.`);
}

export async function listMessages(): Promise<ContactMessage[]> {
  const { data, error } = await client()
    .from('contact_messages')
    .select(CONTACT_MESSAGE_COLUMNS)
    .order('created_at', { ascending: false });

  if (error) throwDatabaseError('listeleme', error);
  return ((data || []) as ContactMessageRow[]).map(mapContactMessage);
}

export async function createMessage(
  input: ContactMessageInput,
  ipAddress: string
): Promise<ContactMessage> {
  const db = client();
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count, error: countError } = await db
    .from('contact_messages')
    .select('id', { count: 'exact', head: true })
    .eq('ip_address', ipAddress)
    .gte('created_at', since);

  if (countError) throwDatabaseError('gönderim sınırı kontrolü', countError);
  if ((count || 0) >= 3) {
    throw new MessageStoreError(
      'Çok fazla mesaj gönderildi. Lütfen bir dakika sonra tekrar deneyin.',
      429,
      'RATE_LIMITED'
    );
  }

  const { data, error } = await db
    .from('contact_messages')
    .insert({
      name: input.name,
      email: input.email.toLowerCase(),
      subject: input.subject,
      phone: input.phone,
      message: input.message,
      is_read: false,
      is_starred: false,
      ip_address: ipAddress,
    })
    .select(CONTACT_MESSAGE_COLUMNS)
    .single();

  if (error) throwDatabaseError('kaydetme', error);
  return mapContactMessage(data as ContactMessageRow);
}

export async function markAllMessagesRead(): Promise<void> {
  const { error } = await client()
    .from('contact_messages')
    .update({ is_read: true })
    .eq('is_read', false);
  if (error) throwDatabaseError('tümünü okundu işaretleme', error);
}

export async function updateMessage(
  id: string,
  values: { isRead?: boolean; isStarred?: boolean }
): Promise<ContactMessage> {
  const payload: Record<string, boolean> = {};
  if (typeof values.isRead === 'boolean') payload.is_read = values.isRead;
  if (typeof values.isStarred === 'boolean') payload.is_starred = values.isStarred;
  if (Object.keys(payload).length === 0) {
    throw new MessageStoreError('Güncellenecek bir alan gönderilmedi.', 400, 'INVALID_UPDATE');
  }

  const { data, error } = await client()
    .from('contact_messages')
    .update(payload)
    .eq('id', id)
    .select(CONTACT_MESSAGE_COLUMNS)
    .maybeSingle();
  if (error) throwDatabaseError('güncelleme', error);
  if (!data) throw new MessageStoreError('Mesaj bulunamadı.', 404, 'NOT_FOUND');
  return mapContactMessage(data as ContactMessageRow);
}

export async function deleteMessage(id: string): Promise<void> {
  const { data, error } = await client()
    .from('contact_messages')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throwDatabaseError('silme', error);
  if (!data) throw new MessageStoreError('Mesaj bulunamadı.', 404, 'NOT_FOUND');
}

export async function deleteReadMessages(): Promise<void> {
  const { error } = await client().from('contact_messages').delete().eq('is_read', true);
  if (error) throwDatabaseError('okunmuş mesajları silme', error);
}
