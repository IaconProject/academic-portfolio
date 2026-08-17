import Link from 'next/link';
import type { Profile } from '@/lib/types';

export function SiteFooter({ profile }: { profile: Profile }) {
  return (
    <footer className="border-t border-academic-border bg-academic-surface-muted/70 px-5 py-8 text-center text-xs text-academic-slate">
      <p>
        © {new Date().getFullYear()} {profile.fullName}
        <span aria-hidden="true"> · </span>
        <Link href="/gizlilik" className="font-semibold underline underline-offset-4">Gizlilik ve çerezler</Link>
      </p>
      <p className="mt-2 text-[11px]">Akademik biyografi, yayın, proje ve araştırma arşivi</p>
    </footer>
  );
}
