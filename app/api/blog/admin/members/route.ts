import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireBlogIdentity } from '@/lib/blog-auth';
import { blogAdminError, blogAdminJson } from '@/lib/blog/admin-api';
import { absoluteUrl } from '@/lib/seo';
import {
  hasSupabaseServiceRole,
  serverSupabase,
} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const managedRoleSchema = z.enum(['editor', 'author', 'viewer']);
const inviteSchema = z
  .object({
    email: z.string().trim().email().max(320),
    displayName: z.string().trim().max(160).default(''),
    role: managedRoleSchema,
  })
  .strict();
const updateSchema = z
  .object({
    userId: z.string().uuid(),
    displayName: z.string().trim().max(160),
    role: managedRoleSchema,
  })
  .strict();

function requireAdminClient() {
  if (!hasSupabaseServiceRole || !serverSupabase) {
    throw new Error('SUPABASE_SERVICE_ROLE_REQUIRED');
  }
  return serverSupabase;
}

async function listAuthUsers() {
  const client = requireAdminClient();
  const users: Array<{
    id: string;
    email?: string;
    last_sign_in_at?: string;
    invited_at?: string;
  }> = [];
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < perPage) break;
  }
  return users;
}

export async function GET() {
  try {
    await requireBlogIdentity({ roles: ['owner'] });
    const client = requireAdminClient();
    const [{ data: members, error }, users] = await Promise.all([
      client
        .from('blog_members')
        .select('user_id, role, display_name, avatar_url, created_at, updated_at')
        .order('created_at', { ascending: true }),
      listAuthUsers(),
    ]);
    if (error) throw error;
    const usersById = new Map(users.map((user) => [user.id, user]));
    return blogAdminJson({
      members: (members || []).map((member) => {
        const user = usersById.get(member.user_id);
        return {
          ...member,
          email: user?.email || '',
          last_sign_in_at: user?.last_sign_in_at || null,
          invited_at: user?.invited_at || null,
        };
      }),
    });
  } catch (error) {
    return blogAdminError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireBlogIdentity({ roles: ['owner'] });
    const input = inviteSchema.parse(await request.json());
    const client = requireAdminClient();
    const normalizedEmail = input.email.toLowerCase();
    const users = await listAuthUsers();
    let user = users.find(
      (candidate) => candidate.email?.toLowerCase() === normalizedEmail
    );
    let invited = false;

    if (!user) {
      const { data, error } = await client.auth.admin.inviteUserByEmail(
        normalizedEmail,
        {
          data: {
            display_name: input.displayName,
            blog_role: input.role,
          },
          redirectTo: absoluteUrl('/admin/login'),
        }
      );
      if (error || !data.user) throw error || new Error('INVITE_USER_MISSING');
      user = data.user;
      invited = true;
    }

    const { data: existingMember, error: existingMemberError } = await client
      .from('blog_members')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    if (existingMemberError) throw existingMemberError;
    if (existingMember?.role === 'owner') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'OWNER_ROLE_IMMUTABLE',
            message: 'Sahip hesabının rolü davet akışıyla değiştirilemez.',
          },
        },
        { status: 409, headers: { 'Cache-Control': 'private, no-cache, no-store' } }
      );
    }

    const { data: member, error: memberError } = await client
      .from('blog_members')
      .upsert(
        {
          user_id: user.id,
          role: input.role,
          display_name: input.displayName,
        },
        { onConflict: 'user_id' }
      )
      .select('*')
      .single();
    if (memberError) throw memberError;
    return blogAdminJson({ member, invited }, invited ? 201 : 200);
  } catch (error) {
    return blogAdminError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const identity = await requireBlogIdentity({ roles: ['owner'] });
    const input = updateSchema.parse(await request.json());
    if (input.userId === identity.userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'OWNER_ROLE_IMMUTABLE',
            message: 'Kendi sahip rolünüzü bu ekrandan değiştiremezsiniz.',
          },
        },
        { status: 409, headers: { 'Cache-Control': 'private, no-cache, no-store' } }
      );
    }
    const client = requireAdminClient();
    const { data, error } = await client
      .from('blog_members')
      .update({ role: input.role, display_name: input.displayName })
      .eq('user_id', input.userId)
      .neq('role', 'owner')
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MEMBER_NOT_EDITABLE',
            message: 'Üye bulunamadı veya sahip rolü değiştirilemez.',
          },
        },
        { status: 404, headers: { 'Cache-Control': 'private, no-cache, no-store' } }
      );
    }
    return blogAdminJson({ member: data });
  } catch (error) {
    return blogAdminError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const identity = await requireBlogIdentity({ roles: ['owner'] });
    const userId = z
      .string()
      .uuid()
      .parse(request.nextUrl.searchParams.get('userId'));
    if (userId === identity.userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'OWNER_DELETE_FORBIDDEN',
            message: 'Kendi sahip üyeliğinizi silemezsiniz.',
          },
        },
        { status: 409, headers: { 'Cache-Control': 'private, no-cache, no-store' } }
      );
    }
    const client = requireAdminClient();
    const { data, error } = await client
      .from('blog_members')
      .delete()
      .eq('user_id', userId)
      .neq('role', 'owner')
      .select('user_id')
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'MEMBER_NOT_FOUND', message: 'Üye bulunamadı.' },
        },
        { status: 404, headers: { 'Cache-Control': 'private, no-cache, no-store' } }
      );
    }
    return blogAdminJson({ removed: true });
  } catch (error) {
    return blogAdminError(error);
  }
}
