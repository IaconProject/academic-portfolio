import 'server-only';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isServerSupabaseConfigured = Boolean(
  supabaseUrl && (serviceRoleKey || anonKey)
);

export const hasSupabaseServiceRole = Boolean(supabaseUrl && serviceRoleKey);

export const serverSupabase = isServerSupabaseConfigured
  ? createClient(supabaseUrl, serviceRoleKey || anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;
