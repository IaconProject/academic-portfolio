import React from 'react';
import Image from 'next/image';
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
import { Profile } from '@/lib/types';

interface DesktopSidebarProps {
  profile: Profile;
  pageContext?: 'home' | 'subpage';
  currentArchive?: '/yayinlar' | '/projeler' | '/yazilar';
}

const sectionItems = [
  { id: 'hakkinda', label: 'Hakkında', icon: User },
  { id: 'egitim', label: 'Eğitim', icon: School },
  { id: 'yayinlar', label: 'Yayınlar', icon: BookOpen },
  { id: 'projeler', label: 'Projeler', icon: GitBranch },
  { id: 'sempozyum', label: 'Sempozyum & Konferans', icon: Mic },
  { id: 'faaliyetler', label: 'Faaliyetler', icon: ListOrdered },
  { id: 'referanslar', label: 'Referanslar', icon: Users },
  { id: 'iletisim', label: 'İletişim', icon: Mail },
];

const archiveItems = [
  { href: '/yayinlar' as const, label: 'Tüm yayınlar', icon: BookOpen },
  { href: '/projeler' as const, label: 'Tüm projeler', icon: GitBranch },
  { href: '/yazilar' as const, label: 'Akademik yazılar', icon: FileText },
];

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  profile,
  pageContext = 'home',
  currentArchive,
}) => {
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-72 flex-col overflow-hidden border-r border-[#2d333b] bg-[#1c2128] font-sans text-[#e6e1d6] shadow-2xl lg:flex">
      <div className="flex flex-col items-center border-b border-[#2d333b] p-8 text-center">
        <Link
          href="/"
          aria-label={profile.fullName + ' ana sayfası'}
          className="group flex flex-col items-center"
        >
          <span className="relative mb-5 flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-[#373e47] bg-[#2d333b] shadow-xl transition-transform duration-300 group-hover:scale-[1.02]">
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={profile.fullName}
                fill
                sizes="128px"
                className="rounded-full object-cover"
                priority
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center rounded-full bg-[#2d333b] font-serif text-3xl text-[#e6e1d6]">
                {profile.fullName.charAt(0)}
              </span>
            )}
          </span>
          <span className="font-serif text-xl font-bold leading-tight tracking-tight text-[#f0ebe1]">
            {profile.fullName}
          </span>
          <span className="mt-2 text-xs italic leading-snug text-[#adbac7] opacity-90">
            {profile.title}
          </span>
        </Link>
      </div>

      <nav aria-label="Akademik özgeçmiş menüsü" className="flex-1 overflow-y-auto px-4 py-5">
        <ul className="space-y-1">
          {sectionItems.map((item) => {
            const Icon = item.icon;
            const href = pageContext === 'home' ? '#' + item.id : '/#' + item.id;
            return (
              <li key={item.id}>
                <Link
                  href={href}
                  className="group flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium text-[#adbac7] transition-colors duration-200 hover:bg-[#232932] hover:text-white"
                >
                  <span className="flex items-center gap-3.5">
                    <Icon className="h-4 w-4 shrink-0 text-[#768390] transition-colors group-hover:text-[#adbac7]" />
                    <span>{item.label}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mx-4 my-5 border-t border-[#2d333b]" />
        <p className="px-4 text-[10px] font-black uppercase tracking-[0.18em] text-[#768390]">
          İçerik arşivleri
        </p>
        <ul className="mt-2 space-y-1">
          {archiveItems.map((item) => {
            const Icon = item.icon;
            const active = currentArchive === item.href;
            const className =
              'group flex items-center gap-3.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors duration-200 ' +
              (active
                ? 'bg-[#303741] text-white'
                : 'text-[#adbac7] hover:bg-[#232932] hover:text-white');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={className}
                >
                  <Icon className="h-4 w-4 shrink-0 text-[#768390] transition-colors group-hover:text-[#adbac7]" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};
