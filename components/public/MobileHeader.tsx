'use client';

import React, { useEffect, useState } from 'react';
import { User, School, BookOpen, GitBranch, Mic, ListOrdered, Users, Mail } from 'lucide-react';

const navItems = [
  { id: 'hakkinda', label: 'Hakkında', icon: User },
  { id: 'egitim', label: 'Eğitim', icon: School },
  { id: 'yayinlar', label: 'Yayınlar', icon: BookOpen },
  { id: 'projeler', label: 'Projeler', icon: GitBranch },
  { id: 'sempozyum', label: 'Sempozyumlar', icon: Mic },
  { id: 'faaliyetler', label: 'Faaliyetler', icon: ListOrdered },
  { id: 'referanslar', label: 'Referanslar', icon: Users },
  { id: 'iletisim', label: 'İletişim', icon: Mail },
];

export const MobileHeader: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen((open) => !open);
  const closeMenu = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  return (
    <>
      {/* Floating Minimal Burger Button */}
      <button
        onClick={toggleMenu}
        aria-label={isOpen ? 'Menüyü kapat' : 'Menüyü aç'}
        aria-controls="mobile-navigation-drawer"
        aria-expanded={isOpen}
        className={`fixed left-4 top-4 z-[80] flex h-11 w-11 items-center justify-center rounded-2xl border shadow-md backdrop-blur-md transition-[transform,background-color,color,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:hidden ${
          isOpen
            ? 'border-[#1c2128] bg-[#1c2128] text-[#f7f5f0] shadow-xl'
            : 'border-stone-300/80 bg-[#f7f5f0]/95 text-stone-900 hover:bg-[#eee8dc]'
        }`}
        style={{
          transform: isOpen
            ? 'translateX(calc(min(18rem, 82vw) - 3.75rem))'
            : 'translateX(0)',
          willChange: 'transform',
        }}
      >
        <span aria-hidden="true" className="relative block h-5 w-5">
          <span
            className={`absolute left-0 h-0.5 w-5 rounded-full bg-current transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
              isOpen ? 'top-[9px] rotate-45' : 'top-[3px] rotate-0'
            }`}
          />
          <span
            className={`absolute left-0 top-[9px] h-0.5 w-5 rounded-full bg-current transition-all duration-300 motion-reduce:transition-none ${
              isOpen ? 'scale-x-0 opacity-0' : 'scale-x-100 opacity-100'
            }`}
          />
          <span
            className={`absolute left-0 h-0.5 w-5 rounded-full bg-current transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
              isOpen ? 'top-[9px] -rotate-45' : 'top-[15px] rotate-0'
            }`}
          />
        </span>
      </button>

      {/* Backdrop Overlay */}
      <div
        onClick={closeMenu}
        aria-hidden="true"
        className={`fixed inset-0 z-[60] bg-[#1c2128]/40 backdrop-blur-[2px] transition-opacity duration-500 motion-reduce:transition-none lg:hidden ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Sliding Mobile Navigation Drawer */}
      <nav
        id="mobile-navigation-drawer"
        aria-label="Mobil ana menü"
        aria-hidden={!isOpen}
        className={`fixed left-0 top-0 z-[70] h-full w-[min(18rem,82vw)] overflow-y-auto border-r border-[#d9d1c2] bg-[#f1ece2] p-6 pt-20 shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <ul className="space-y-2">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={closeMenu}
                  tabIndex={isOpen ? undefined : -1}
                  className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium text-stone-700 transition-[transform,opacity,background-color,color] duration-500 ease-out hover:bg-[#e3dccf] hover:text-stone-950 motion-reduce:transition-none ${
                    isOpen
                      ? 'translate-x-0 opacity-100'
                      : '-translate-x-3 opacity-0'
                  }`}
                  style={{
                    transitionDelay: isOpen
                      ? `${100 + index * 45}ms`
                      : '0ms',
                  }}
                >
                  <Icon className="h-5 w-5 text-stone-400" />
                  <span>{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
};
