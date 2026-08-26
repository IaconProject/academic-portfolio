import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/ssr-server';
import {
  hasSupabaseServiceRole,
  serverSupabase,
} from '@/lib/supabase/server';

export type BlogRole = 'owner' | 'editor' | 'author' | 'viewer';

export class BlogAuthError extends Error {
  constructor(
    readonly code:
      | 'AUTH_NOT_CONFIGURED'
      | 'UNAUTHORIZED'
      | 'MFA_REQUIRED'
      | 'MEMBERSHIP_REQUIRED'
      | 'FORBIDDEN',
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'BlogAuthError';
  }
}

interface RequireBlogIdentityOptions {
  allowOwnerClaim?: boolean;
  roles?: BlogRole[];
  requireMfa?: boolean;
}

export interface BlogIdentity {
  client: SupabaseClient;
  userId: string;
  email: string;
  role: BlogRole;
  aal: string;
}

async function prepareOwnerClaim(email: string) {
  if (!hasSupabaseServiceRole || !serverSupabase) return;

  const configuredOwner = (
    process.env.BLOG_OWNER_EMAIL ||
    process.env.CMS_ADMIN_EMAIL ||
    ''
  )
    .trim()
    .toLowerCase();

  if (!configuredOwner || configuredOwner !== email.toLowerCase()) return;

  const { count, error: countError } = await serverSupabase
    .from('blog_members')
    .select('user_id', { count: 'exact', head: true });

  if (countError || (count ?? 0) > 0) return;

  await serverSupabase
    .from('blog_settings')
    .update({ owner_email: configuredOwner })
    .eq('id', 1);
}

export async function requireBlogIdentity(
  options: RequireBlogIdentityOptions = {}
): Promise<BlogIdentity> {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw new BlogAuthError(
      'AUTH_NOT_CONFIGURED',
      'Supabase Auth yapılandırılmamış.',
      503
    );
  }

  const { data: claimData, error: claimsError } =
    await client.auth.getClaims();
  const claims = claimData?.claims;
  const userId = typeof claims?.sub === 'string' ? claims.sub : '';
  const email = typeof claims?.email === 'string' ? claims.email : '';
  const aal = typeof claims?.aal === 'string' ? claims.aal : 'aal1';

  if (claimsError || !userId || !email) {
    throw new BlogAuthError(
      'UNAUTHORIZED',
      'Kimlik doğrulaması gerekli.',
      401
    );
  }

  const requireMfa =
    options.requireMfa ?? process.env.BLOG_REQUIRE_MFA !== 'false';
  if (requireMfa && aal !== 'aal2') {
    throw new BlogAuthError(
      'MFA_REQUIRED',
      'İki aşamalı doğrulama gerekli.',
      401
    );
  }

  const { data: savedMember, error: memberError } = await client
    .from('blog_members')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  let member = savedMember;

  if (!member && !memberError && options.allowOwnerClaim) {
    await prepareOwnerClaim(email);
    const claimResult = await client.rpc('claim_blog_owner');
    if (!claimResult.error) {
      member = { role: claimResult.data };
    }
  }

  if (memberError || !member?.role) {
    throw new BlogAuthError(
      'MEMBERSHIP_REQUIRED',
      'Bu hesap blog yönetimine yetkili değil.',
      403
    );
  }

  const role = member.role as BlogRole;
  if (options.roles && !options.roles.includes(role)) {
    throw new BlogAuthError(
      'FORBIDDEN',
      'Bu işlem için yeterli yetkiniz yok.',
      403
    );
  }

  return { client, userId, email, role, aal };
}
