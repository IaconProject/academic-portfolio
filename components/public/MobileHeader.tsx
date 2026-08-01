'use client';

import React, { useState } from 'react';
import { Menu, User, School, BookOpen, GitBranch, Mic, ListOrdered, Users, Mail, X } from 'lucide-react';

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

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Floating Minimal Burger Button */}
      <button
        onClick={toggleMenu}
        aria-label={isOpen ? 'Menüyü kapat' : 'Menüyü aç'}
        className="lg:hidden fixed top-4 left-4 z-50 w-11 h-11 bg-white/95 text-stone-900 rounded-2xl border border-stone-300/80 shadow-md flex items-center justify-center backdrop-blur-md hover:bg-stone-50 transition-all active:scale-95"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={closeMenu}
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity animate-fade-in"
        />
      )}

      {/* Sliding Mobile Navigation Drawer */}
      <nav
        className={`lg:hidden fixed top-0 left-0 h-full w-72 bg-white z-[70] shadow-2xl p-6 pt-12 overflow-y-auto transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={closeMenu}
                  className="flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium text-stone-700 transition-all hover:bg-stone-100 hover:text-stone-950"
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
