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
      {/* Floating Minimal Burger Button only (No Full Bar, No PORTFOLYO text) */}
      <button
        onClick={toggleMenu}
        aria-label="Menüyü Aç"
        className="lg:hidden fixed top-4 left-4 z-50 w-11 h-11 bg-white/95 text-academic-navy rounded-2xl border border-slate-200/90 shadow-lg shadow-slate-900/10 flex items-center justify-center backdrop-blur-md hover:bg-slate-50 transition-all active:scale-95"
      >
        <Menu className="w-5 h-5" />
      </button>

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

        <ul className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={closeMenu}
                  className={`flex items-center gap-3.5 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-academic-navy text-white font-bold shadow-md shadow-academic-navy/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-academic-navy'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
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
