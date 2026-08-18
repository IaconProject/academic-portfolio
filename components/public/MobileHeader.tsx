'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  FileText,
  GitBranch,
  ListOrdered,
  Mail,
  Mic,
  School,
  User,
  Users,
} from 'lucide-react';

interface MobileHeaderProps {
  pageContext?: 'home' | 'subpage';
  currentArchive?: '/yayinlar' | '/projeler' | '/yazilar';
}

const sectionItems = [
  { id: 'hakkinda', label: 'Hakkında', icon: User },
  { id: 'egitim', label: 'Eğitim', icon: School },
  { id: 'yayinlar', label: 'Yayınlar', icon: BookOpen },
  { id: 'projeler', label: 'Projeler', icon: GitBranch },
  { id: 'sempozyum', label: 'Sempozyumlar', icon: Mic },
  { id: 'faaliyetler', label: 'Faaliyetler', icon: ListOrdered },
  { id: 'referanslar', label: 'Referanslar', icon: Users },
  { id: 'iletisim', label: 'İletişim', icon: Mail },
];

const archiveItems = [
  { href: '/yayinlar' as const, label: 'Tüm yayınlar', icon: BookOpen },
  { href: '/projeler' as const, label: 'Tüm projeler', icon: GitBranch },
  { href: '/yazilar' as const, label: 'Akademik yazılar', icon: FileText },
];

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  pageContext = 'home',
  currentArchive,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen((open) => !open);
  const closeMenu = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeAtDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) closeMenu();
    };
    desktop.addEventListener('change', closeAtDesktop);
    return () => desktop.removeEventListener('change', closeAtDesktop);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={toggleMenu}
        aria-label={isOpen ? 'Menüyü kapat' : 'Menüyü aç'}
        aria-controls="mobile-navigation-drawer"
        aria-expanded={isOpen}
        className={
          'fixed left-4 top-4 z-[80] flex h-11 w-11 items-center justify-center rounded-2xl border shadow-md backdrop-blur-md transition-[transform,background-color,color,border-color,box-shadow,border-radius] duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none lg:hidden ' +
          (isOpen
            ? 'rounded-full border-[#1c2128] bg-[#1c2128] text-academic-bg shadow-xl ring-4 ring-academic-bg/80'
            : 'border-stone-300/80 bg-academic-bg/95 text-stone-900 hover:bg-[#eee8dc]')
        }
        style={{
          transform: isOpen
            ? 'translateX(calc(min(18rem, 80vw) - 0.25rem))'
            : 'translateX(0)',
          willChange: 'transform',
        }}
      >
        <span aria-hidden="true" className="relative block h-5 w-5">
          <span
            className={
              'absolute left-0 h-0.5 w-5 rounded-full bg-current transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ' +
              (isOpen ? 'top-[9px] rotate-45' : 'top-[3px] rotate-0')
            }
          />
          <span
            className={
              'absolute left-0 top-[9px] h-0.5 w-5 rounded-full bg-current transition-all duration-300 motion-reduce:transition-none ' +
              (isOpen ? 'scale-x-0 opacity-0' : 'scale-x-100 opacity-100')
            }
          />
          <span
            className={
              'absolute left-0 h-0.5 w-5 rounded-full bg-current transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ' +
              (isOpen ? 'top-[9px] -rotate-45' : 'top-[15px] rotate-0')
            }
          />
        </span>
      </button>

      <div
        onClick={closeMenu}
        aria-hidden="true"
        className={
          'fixed inset-0 z-[60] bg-[#1c2128]/40 backdrop-blur-[2px] transition-opacity duration-500 motion-reduce:transition-none lg:hidden ' +
          (isOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0')
        }
      />

      <nav
        id="mobile-navigation-drawer"
        aria-label="Mobil ana menü"
        aria-hidden={!isOpen}
        className={
          'fixed left-0 top-0 z-[70] h-full w-[min(18rem,80vw)] overflow-y-auto border-r border-[#ddd7ca] bg-academic-bg p-6 pt-20 shadow-2xl transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none lg:hidden ' +
          (isOpen ? 'translate-x-0' : '-translate-x-full')
        }
      >
        <ul className="space-y-2">
          {sectionItems.map((item, index) => {
            const Icon = item.icon;
            const href = pageContext === 'home' ? '#' + item.id : '/#' + item.id;
            const itemClass =
              'flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium text-stone-700 transition-[transform,opacity,background-color,color] duration-500 ease-out hover:bg-[#e3dccf] hover:text-stone-950 motion-reduce:transition-none ' +
              (isOpen
                ? 'translate-x-0 opacity-100'
                : '-translate-x-3 opacity-0');
            return (
              <li key={item.id}>
                <Link
                  href={href}
                  onClick={closeMenu}
                  tabIndex={isOpen ? undefined : -1}
                  className={itemClass}
                  style={{
                    transitionDelay: isOpen
                      ? String(100 + index * 45) + 'ms'
                      : '0ms',
                  }}
                >
                  <Icon className="h-5 w-5 text-stone-400" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="my-5 border-t border-academic-border" />
        <p className="px-4 text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">
          İçerik arşivleri
        </p>
        <ul className="mt-2 space-y-2">
          {archiveItems.map((item, index) => {
            const Icon = item.icon;
            const active = currentArchive === item.href;
            const itemClass =
              'flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-semibold transition-[transform,opacity,background-color,color] duration-500 ease-out motion-reduce:transition-none ' +
              (active
                ? 'bg-[#1c2128] text-[#f0ebe1]'
                : 'text-stone-700 hover:bg-[#e3dccf] hover:text-stone-950') +
              (isOpen
                ? ' translate-x-0 opacity-100'
                : ' -translate-x-3 opacity-0');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  onClick={closeMenu}
                  tabIndex={isOpen ? undefined : -1}
                  className={itemClass}
                  style={{
                    transitionDelay: isOpen
                      ? String(480 + index * 45) + 'ms'
                      : '0ms',
                  }}
                >
                  <Icon className="h-5 w-5 text-stone-400" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
};
