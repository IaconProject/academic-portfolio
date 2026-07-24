'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Profile, SocialLink } from '@/lib/types';
import { User, School, BookOpen, GitBranch, Mic, ListOrdered, Users, Mail } from 'lucide-react';

interface DesktopSidebarProps {
  profile: Profile;
  socialLinks: SocialLink[];
  activeSection: string;
}

const navItems = [
  { id: 'hakkinda', label: 'Hakkında', icon: User },
  { id: 'egitim', label: 'Eğitim', icon: School },
  { id: 'yayinlar', label: 'Yayınlar', icon: BookOpen },
  { id: 'projeler', label: 'Projeler', icon: GitBranch },
  { id: 'sempozyum', label: 'Sempozyum & Konferans', icon: Mic },
  { id: 'faaliyetler', label: 'Faaliyetler', icon: ListOrdered },
  { id: 'referanslar', label: 'Referanslar', icon: Users },
  { id: 'iletisim', label: 'İletişim', icon: Mail },
];

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ profile, activeSection }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-72 bg-academic-navy text-white flex-col z-50 shadow-2xl overflow-hidden">
      {/* Header Profile Section */}
      <div className="p-8 flex flex-col items-center border-b border-white/10 text-center">
        <div className="relative w-32 h-32 aspect-square rounded-full overflow-hidden border-4 border-white/20 mb-5 shadow-xl transition-transform hover:scale-105 bg-slate-800 flex items-center justify-center">
          {profile.avatarUrl && !imgError ? (
            <Image
              src={profile.avatarUrl}
              alt={profile.fullName}
              fill
              sizes="128px"
              className="object-cover rounded-full"
              unoptimized
              onError={() => setImgError(true)}
              priority
            />
          ) : (
            <div className="w-full h-full bg-slate-700 flex items-center justify-center text-white text-3xl font-serif rounded-full">
              {profile.fullName.charAt(0)}
            </div>
          )}
        </div>
        <h1 className="text-xl font-serif font-bold tracking-tight text-white leading-tight uppercase">
          {profile.fullName}
        </h1>
        <p className="text-xs text-slate-300 mt-2 font-sans italic opacity-90 leading-snug">
          {profile.title}
        </p>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto py-6 px-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white/15 text-white font-semibold shadow-inner border-l-4 border-amber-400 pl-3'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0 opacity-80" />
                  <span>{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Clean Footer */}
      <div className="p-6 border-t border-white/10 text-center bg-black/10">
        <div className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
          © {new Date().getFullYear()} {profile.fullName}
        </div>
      </div>
    </aside>
  );
};
