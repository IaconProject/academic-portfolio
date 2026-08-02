import 'server-only';

import {
  hasSupabaseServiceRole,
  serverSupabase,
} from '@/lib/supabase/server';

export interface StoredAdminCredentials {
  id: string;
  email: string;
  password: string;
}

export class AdminCredentialStoreError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = 'AdminCredentialStoreError';
  }
}

function requireCredentialStore() {
  if (!hasSupabaseServiceRole || !serverSupabase) {
    throw new AdminCredentialStoreError(
      'Yönetici kimlik bilgisi deposu kullanılamıyor.',
      'CREDENTIAL_STORE_UNAVAILABLE'
    );
  }

  return serverSupabase;
}

export async function readAdminCredentials(): Promise<StoredAdminCredentials> {
  const supabase = requireCredentialStore();
  const { data, error } = await supabase
    .from('admin_credentials')
    .select('id, email, password')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[admin-credentials] read failed', {
      code: error.code,
      message: error.message,
    });
    throw new AdminCredentialStoreError(
      'Yönetici kimlik bilgileri okunamadı.',
      'CREDENTIAL_READ_FAILED'
    );
  }

  if (!data?.id || !data.email || !data.password) {
    throw new AdminCredentialStoreError(
      'Yönetici kimlik bilgisi kaydı eksik veya geçersiz.',
      'CREDENTIAL_RECORD_INVALID'
    );
  }

  return data as StoredAdminCredentials;
}

export async function writeAdminCredentials({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<void> {
  if (!email || !password) {
    throw new AdminCredentialStoreError(
      'Boş yönetici kimlik bilgileri kaydedilemez.',
      'CREDENTIAL_INPUT_INVALID'
    );
  }

  const supabase = requireCredentialStore();
  const { data: existing, error: readError } = await supabase
    .from('admin_credentials')
    .select('id')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readError) {
    console.error('[admin-credentials] pre-write read failed', {
      code: readError.code,
      message: readError.message,
    });
    throw new AdminCredentialStoreError(
      'Yönetici kimlik bilgileri güncellenemedi.',
      'CREDENTIAL_WRITE_FAILED'
    );
  }

  const values = {
    email: email.trim().toLowerCase(),
    password,
    updated_at: new Date().toISOString(),
  };
  const mutation = existing?.id
    ? supabase
        .from('admin_credentials')
        .update(values)
        .eq('id', existing.id)
        .select('id')
        .single()
    : supabase
        .from('admin_credentials')
        .insert(values)
        .select('id')
        .single();
  const { data, error } = await mutation;

  if (error || !data?.id) {
    console.error('[admin-credentials] write failed', {
      code: error?.code,
      message: error?.message,
    });
    throw new AdminCredentialStoreError(
      'Yönetici kimlik bilgileri kalıcı olarak kaydedilemedi.',
      'CREDENTIAL_WRITE_FAILED'
    );
  }
}
