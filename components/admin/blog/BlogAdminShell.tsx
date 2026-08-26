'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  BookOpenText,
  Boxes,
  ExternalLink,
  FileText,
  Home,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Network,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import type { BlogRole } from '@/lib/blog-auth';

const navigation = [
  { href: '/admin/blog', label: 'Genel bakış', icon: LayoutDashboard, roles: ['owner', 'editor', 'author', 'viewer'] },
  { href: '/admin/blog/yazilar', label: 'Yazılar', icon: FileText, roles: ['owner', 'editor', 'author', 'viewer'] },
  { href: '/admin/blog/anasayfa', label: 'Ana sayfa', icon: Home, roles: ['owner', 'editor'] },
  { href: '/admin/blog/medya', label: 'Medya', icon: ImageIcon, roles: ['owner', 'editor', 'author', 'viewer'] },
  { href: '/admin/blog/taksonomi', label: 'Kategoriler', icon: Boxes, roles: ['owner', 'editor'] },
  { href: '/admin/blog/menu', label: 'Menüler', icon: Network, roles: ['owner', 'editor'] },
  { href: '/admin/blog/ayarlar', label: 'Ayarlar', icon: Settings, roles: ['owner', 'editor'] },
  { href: '/admin/blog/bulten', label: 'Bülten', icon: Mail, roles: ['owner'] },
  { href: '/admin/blog/analitik', label: 'Analitik', icon: BarChart3, roles: ['owner', 'editor'] },
  { href: '/admin/blog/ekip', label: 'Ekip', icon: Users, roles: ['owner'] },
] as const;

const roleLabels: Record<BlogRole, string> = {
  owner: 'Sahip',
  editor: 'Editör',
  author: 'Yazar',
  viewer: 'Görüntüleyici',
};

export function BlogAdminShell({
  children,
  email,
  role,
}: {
  children: React.ReactNode;
  email: string;
  role: BlogRole;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = navigation.filter((item) =>
    (item.roles as readonly string[]).includes(role)
  );

  async function signOut() {
    await fetch('/api/blog/auth/sign-out', { method: 'POST' }).catch(() => null);
    router.push('/admin/login');
    router.refresh();
  }

  const nav = (
    <>
      <div className="border-b border-stone-800 px-5 py-5">
        <Link href="/admin/blog" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400 text-stone-950">
            <BookOpenText className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-black text-white">Blog CMS</span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">
              Muhammed Akan
            </span>
          </span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Blog yönetimi">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === '/admin/blog'
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                active
                  ? 'bg-amber-400 text-stone-950'
                  : 'text-stone-400 hover:bg-stone-800 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" /> {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-stone-800 p-3">
        <div className="rounded-xl bg-stone-900 p-3">
          <p className="truncate text-xs font-bold text-stone-200">{email}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-400">
            {roleLabels[role]}
          </p>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Link
            href="/blog"
            target="_blank"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-800 px-2 py-2.5 text-[11px] font-bold text-stone-300 hover:bg-stone-900"
          >
            Site <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-800 px-2 py-2.5 text-[11px] font-bold text-stone-300 hover:bg-stone-900"
          >
            Çıkış <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f3efe6] text-stone-900 dark:bg-[#121110] dark:text-stone-100">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col bg-stone-950 lg:flex">
        {nav}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Menüyü kapat"
          />
          <aside className="relative flex h-full w-72 flex-col bg-stone-950 shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-stone-800 text-white"
              aria-label="Menüyü kapat"
            >
              <X className="h-4 w-4" />
            </button>
            {nav}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-stone-200 bg-[#f9f6ef]/90 px-4 backdrop-blur-xl dark:border-stone-800 dark:bg-stone-950/90 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-900 lg:hidden"
            aria-label="Yönetim menüsünü aç"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="hidden text-xs font-black uppercase tracking-[0.16em] text-stone-500 sm:block">
            Gelişmiş yayın merkezi
          </p>
          <Link
            href="/admin"
            className="ml-auto text-xs font-bold text-stone-500 hover:text-stone-950 dark:hover:text-white"
          >
            Portfolyo CMS’e dön
          </Link>
        </header>
        <div className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
