'use client';

import React, { useState } from 'react';
import { Menu, X, User, School, BookOpen, GitBranch, Mic, ListOrdered, Users, Mail } from 'lucide-react';
import { Profile } from '@/lib/types';

interface MobileHeaderProps {
  profile: Profile;
  activeSection: string;
}

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

export const MobileHeader: React.FC<MobileHeaderProps> = ({ profile, activeSection }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Sticky Minimal Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 w-full z-50 h-14 bg-white/90 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-4 shadow-2xs">
        <button
          onClick={toggleMenu}
          aria-label="Menüyü Aç"
          className="w-10 h-10 flex items-center justify-center text-academic-navy hover:bg-slate-100 rounded-xl transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Minimal Academic Icon Badge */}
        <div className="flex items-center gap-1.5 text-xs font-serif font-bold tracking-widest text-academic-navy opacity-80 uppercase">
          <span>PORTFOLYO</span>
        </div>

        <div className="w-10" />
      </header>

      {/* Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={closeMenu}
          className="lg:hidden fixed inset-0 bg-academic-navy/40 backdrop-blur-sm z-[60] transition-opacity animate-fade-in"
        />
      )}

      {/* Sliding Mobile Navigation Drawer */}
      <nav
        className={`lg:hidden fixed top-0 left-0 h-full w-72 bg-white z-[70] shadow-2xl p-6 overflow-y-auto transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
          <span className="font-serif font-bold text-xl text-academic-navy">Menü</span>
          <button
            onClick={closeMenu}
            aria-label="Kapat"
            className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={closeMenu}
                  className={`flex items-center gap-4 py-3 px-4 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-academic-navy text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-academic-navy'
                  }`}
                >
                  <Icon className="w-5 h-5 opacity-75" />
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
