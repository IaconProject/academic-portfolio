export const supabasePublicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

// New Supabase projects expose a publishable key. Keep the legacy anon key as
// a rollout fallback for the already deployed project.
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export const isSupabaseAuthConfigured = Boolean(
  supabasePublicUrl && supabasePublishableKey
);
