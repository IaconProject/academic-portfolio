'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  isSupabaseAuthConfigured,
  supabasePublicUrl,
  supabasePublishableKey,
} from './config';

let browserClient: SupabaseClient | null = null;

export function createBrowserSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseAuthConfigured) return null;
  if (!browserClient) {
    browserClient = createBrowserClient(
      supabasePublicUrl,
      supabasePublishableKey
    );
  }
  return browserClient;
}
