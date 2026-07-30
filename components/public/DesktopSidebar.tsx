import React from 'react';
import Image from 'next/image';
import { Profile } from '@/lib/types';
import { User, School, BookOpen, GitBranch, Mic, ListOrdered, Users, Mail } from 'lucide-react';

interface DesktopSidebarProps {
  profile: Profile;
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

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ profile }) => {
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-72 bg-[#1c2128] text-[#e6e1d6] flex-col z-50 shadow-2xl border-r border-[#2d333b] overflow-hidden font-sans">
      {/* Header Profile Section */}
      <div className="p-8 flex flex-col items-center border-b border-[#2d333b] text-center">
        <div className="relative mb-5 flex h-32 w-32 aspect-square items-center justify-center overflow-hidden rounded-full border-4 border-[#373e47] bg-[#2d333b] shadow-xl">
          {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={profile.fullName}
                fill
                sizes="128px"
                className="object-cover rounded-full"
                priority
              />
          ) : (
            <div className="w-full h-full bg-[#2d333b] text-[#e6e1d6] flex items-center justify-center text-3xl font-serif rounded-full">
              {profile.fullName.charAt(0)}
            </div>
          )}
        </div>
        <p className="text-xl font-serif font-bold tracking-tight text-[#f0ebe1] leading-tight">
          {profile.fullName}
        </p>
        <p className="text-xs text-[#adbac7] mt-2 font-sans italic opacity-90 leading-snug">
          {profile.title}
        </p>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto py-6 px-4">
        <ul className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-[#adbac7] transition-colors duration-200 hover:bg-[#232932] hover:text-white"
                >
                  <div className="flex items-center gap-3.5">
                    <Icon className="h-4 w-4 shrink-0 text-[#768390] transition-colors duration-200 group-hover:text-[#adbac7]" />
                    <span>{item.label}</span>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};
