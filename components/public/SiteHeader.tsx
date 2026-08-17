'use client';

import { useEffect, useId, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, FileText, FolderKanban, Home, Mail, Menu, User, X } from 'lucide-react';
import type { Profile } from '@/lib/types';

const links = [
  { href: '/', label: 'Ana sayfa', icon: Home },
  { href: '/#hakkinda', label: 'Hakkında', icon: User },
  { href: '/yayinlar', label: 'Yayınlar', icon: BookOpen },
  { href: '/projeler', label: 'Projeler', icon: FolderKanban },
  { href: '/yazilar', label: 'Yazılar', icon: FileText },
  { href: '/#iletisim', label: 'İletişim', icon: Mail },
];

interface SiteHeaderProps {
  profile: Profile;
  mobileOnly?: boolean;
}

export function SiteHeader({ profile, mobileOnly = false }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeAtDesktopBreakpoint = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };
    desktop.addEventListener('change', closeAtDesktopBreakpoint);
    return () => desktop.removeEventListener('change', closeAtDesktopBreakpoint);
  }, []);

  return (
    <header
      className={`${mobileOnly ? 'fixed inset-x-0 top-0 lg:hidden' : 'sticky top-0'} z-50 border-b border-[#303741] bg-[#1c2128]/95 text-[#f0ebe1] shadow-[0_10px_30px_rgba(28,33,40,0.14)] backdrop-blur-xl`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-[4.75rem] lg:px-8">
        <Link href="/" className="group flex min-w-0 items-center gap-3" onClick={() => setOpen(false)}>
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-[#2d333b] shadow-inner lg:h-11 lg:w-11">
            {profile.avatarUrl ? (
              <Image src={profile.avatarUrl} alt="" fill sizes="44px" className="object-cover" priority={mobileOnly} />
            ) : (
              <span className="font-serif text-sm font-bold" aria-hidden="true">{profile.fullName.charAt(0)}</span>
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-serif text-base font-bold tracking-tight transition-colors group-hover:text-white lg:text-lg">{profile.fullName}</span>
            <span className="block max-w-[13rem] truncate text-[11px] text-[#adbac7] sm:max-w-xs lg:text-xs">{profile.title}</span>
          </span>
        </Link>

        {!mobileOnly && (
          <nav aria-label="Ana menü" className="hidden items-center gap-1 lg:flex">
            {links.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#c7ced6] transition-colors hover:bg-white/10 hover:text-white">{item.label}</Link>
            ))}
          </nav>
        )}

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'}
          className={`${!mobileOnly ? 'lg:hidden' : ''} inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#f0ebe1] transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400`}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        aria-hidden={!open}
        className={`${open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'} fixed inset-0 top-16 -z-10 bg-[#1c2128]/55 backdrop-blur-sm transition-opacity duration-300 lg:top-[4.75rem]`}
        onClick={() => setOpen(false)}
      />
      <nav
        id={menuId}
        aria-label="Mobil ana menü"
        className={`${open ? 'translate-y-0 opacity-100' : '-translate-y-3 pointer-events-none opacity-0'} absolute inset-x-0 top-full border-b border-[#303741] bg-[#1c2128] px-4 pb-5 pt-2 shadow-2xl transition duration-300 sm:px-6 ${!mobileOnly ? 'lg:hidden' : ''}`}
      >
        <ul className="mx-auto grid max-w-2xl gap-1 sm:grid-cols-2">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link href={item.href} onClick={() => setOpen(false)} tabIndex={open ? undefined : -1} className="flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[#d8dee4] transition hover:bg-white/10 hover:text-white">
                  <Icon className="h-4 w-4 text-[#8c98a4]" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
