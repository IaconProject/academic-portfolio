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
import { PublicThemeToggle } from '@/components/public/PublicThemeToggle';

interface DesktopSidebarProps {
  profile: Profile;
  pageContext?: 'home' | 'subpage';
  currentArchive?: '/yayinlar' | '/projeler' | '/yazilar';
  themeToggleEnabled?: boolean;
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
  themeToggleEnabled = true,
}) => {
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-72 flex-col overflow-hidden border-r border-academic-sidebar-border bg-academic-sidebar-bg font-sans text-academic-sidebar-ink shadow-2xl transition-colors duration-300 lg:flex">
      <div className="flex flex-col items-center border-b border-academic-sidebar-border p-8 text-center">
        <Link
          href="/"
          aria-label={profile.fullName + ' ana sayfası'}
          className="group flex flex-col items-center"
        >
          <span className="relative mb-5 flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-academic-sidebar-border bg-academic-sidebar-surface shadow-xl transition duration-300 group-hover:scale-[1.02]">
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
              <span className="flex h-full w-full items-center justify-center rounded-full bg-academic-sidebar-surface font-serif text-3xl text-academic-sidebar-ink">
                {profile.fullName.charAt(0)}
              </span>
            )}
          </span>
          <span className="font-serif text-xl font-bold leading-tight tracking-tight text-academic-sidebar-ink">
            {profile.fullName}
          </span>
          <span className="mt-2 text-xs italic leading-snug text-academic-sidebar-muted">
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
                  className="group flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium text-academic-sidebar-muted transition-colors duration-200 hover:bg-academic-sidebar-hover hover:text-academic-sidebar-ink"
                >
                  <span className="flex items-center gap-3.5">
                    <Icon className="h-4 w-4 shrink-0 text-academic-sidebar-muted/70 transition-colors group-hover:text-academic-sidebar-ink" />
                    <span>{item.label}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mx-4 my-5 border-t border-academic-sidebar-border" />
        <p className="px-4 text-[10px] font-black uppercase tracking-[0.18em] text-academic-sidebar-muted/70">
          İçerik arşivleri
        </p>
        <ul className="mt-2 space-y-1">
          {archiveItems.map((item) => {
            const Icon = item.icon;
            const active = currentArchive === item.href;
            const className =
              'group flex items-center gap-3.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors duration-200 ' +
              (active
                ? 'bg-academic-sidebar-active text-academic-sidebar-ink'
                : 'text-academic-sidebar-muted hover:bg-academic-sidebar-hover hover:text-academic-sidebar-ink');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={className}
                >
                  <Icon className="h-4 w-4 shrink-0 text-academic-sidebar-muted/70 transition-colors group-hover:text-academic-sidebar-ink" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {themeToggleEnabled && (
        <div className="border-t border-academic-sidebar-border px-4 py-4">
          <PublicThemeToggle />
        </div>
      )}
    </aside>
  );
};
