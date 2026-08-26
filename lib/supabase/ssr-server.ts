import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  isSupabaseAuthConfigured,
  supabasePublicUrl,
  supabasePublishableKey,
} from './config';

export async function createSupabaseServerClient() {
  if (!isSupabaseAuthConfigured) return null;
  const cookieStore = await cookies();

  return createServerClient(supabasePublicUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, _headers) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. The root proxy refreshes
          // the session before protected pages render.
        }
      },
    },
  });
}
