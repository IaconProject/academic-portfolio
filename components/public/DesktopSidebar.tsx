'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Profile, SocialLink } from '@/lib/types';
import { User, School, BookOpen, GitBranch, Mic, ListOrdered, Users, Mail, ZoomIn } from 'lucide-react';

interface DesktopSidebarProps {
  profile: Profile;
  socialLinks: SocialLink[];
  activeSection: string;
  onOpenAvatar?: (url: string) => void;
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

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ profile, activeSection, onOpenAvatar }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-72 bg-[#1c2128] text-[#e6e1d6] flex-col z-50 shadow-2xl border-r border-[#2d333b] overflow-hidden font-sans">
      {/* Header Profile Section */}
      <div className="p-8 flex flex-col items-center border-b border-[#2d333b] text-center">
        <div
          onClick={() => profile.avatarUrl && !imgError && onOpenAvatar?.(profile.avatarUrl)}
          className="relative w-32 h-32 aspect-square rounded-full overflow-hidden border-4 border-[#373e47] mb-5 shadow-xl transition-all duration-300 hover:scale-105 hover:border-amber-500 bg-[#2d333b] flex items-center justify-center cursor-pointer group"
          title="Fotoğrafı Büyüt"
        >
          {profile.avatarUrl && !imgError ? (
            <>
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
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <ZoomIn className="w-6 h-6" />
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-[#2d333b] text-[#e6e1d6] flex items-center justify-center text-3xl font-serif rounded-full">
              {profile.fullName.charAt(0)}
            </div>
          )}
        </div>
        <h1 className="text-xl font-serif font-bold tracking-tight text-[#f0ebe1] leading-tight">
          {profile.fullName}
        </h1>
        <p className="text-xs text-[#adbac7] mt-2 font-sans italic opacity-90 leading-snug">
          {profile.title}
        </p>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto py-6 px-4">
        <ul className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={`group flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? 'bg-[#2d3540] text-white font-semibold'
                      : 'text-[#adbac7] hover:bg-[#232932] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Icon className={`w-4 h-4 shrink-0 transition-colors duration-200 ${isActive ? 'text-amber-400' : 'text-[#768390] group-hover:text-[#adbac7]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};
