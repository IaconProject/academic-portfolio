import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { BlogAdminShell } from '@/components/admin/blog/BlogAdminShell';
import { BlogAuthError, requireBlogIdentity } from '@/lib/blog-auth';

export const dynamic = 'force-dynamic';

async function resolveIdentity() {
  try {
    return {
      identity: await requireBlogIdentity({
        allowOwnerClaim: true,
        roles: ['owner', 'editor', 'author', 'viewer'],
      }),
      error: null,
    };
  } catch (error) {
    return { identity: null, error };
  }
}

export default async function AdvancedBlogAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { identity, error } = await resolveIdentity();
  if (identity) {
    return (
      <BlogAdminShell email={identity.email} role={identity.role}>
        {children}
      </BlogAdminShell>
    );
  }

  if (
    error instanceof BlogAuthError &&
    ['UNAUTHORIZED', 'MFA_REQUIRED'].includes(error.code)
  ) {
    redirect(error.code === 'MFA_REQUIRED' ? '/admin/login?step=mfa' : '/admin/login');
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-950 p-5 text-white">
      <section className="max-w-lg rounded-3xl border border-stone-800 bg-stone-900 p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-amber-400" />
        <h1 className="mt-5 text-2xl font-black">Blog erişimi bulunamadı</h1>
        <p className="mt-3 text-sm leading-6 text-stone-400">
          Bu hesap blog ekibine eklenmemiş. Blog sahibinden rol atamasını
          isteyin veya yetkili hesapla giriş yapın.
        </p>
        <Link
          href="/admin/login"
          className="mt-6 inline-flex rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-stone-950"
        >
          Giriş sayfasına dön
        </Link>
      </section>
    </main>
  );
}
