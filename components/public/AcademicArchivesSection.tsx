import Link from 'next/link';
import { ArrowUpRight, BookOpen, FileText, FolderKanban } from 'lucide-react';
import type { PortfolioData } from '@/lib/types';
import { isContentPublished } from '@/lib/seo';

export function AcademicArchivesSection({ data }: { data: PortfolioData }) {
  const archives = [
    {
      href: '/yayinlar',
      label: 'Akademik yayınlar',
      description: 'Makaleler, bildiriler, kitap bölümleri ve bibliyografik kayıtlar.',
      count: data.publications.filter((item) => (item.locale || 'tr') === 'tr').length,
      icon: BookOpen,
    },
    {
      href: '/projeler',
      label: 'Araştırma projeleri',
      description: 'Devam eden araştırmalar, disiplinlerarası çalışmalar ve çıktılar.',
      count: data.projects.filter((item) => (item.locale || 'tr') === 'tr').length,
      icon: FolderKanban,
    },
    {
      href: '/yazilar',
      label: 'Akademik yazılar',
      description: 'Kaynaklı incelemeler, kavramsal değerlendirmeler ve araştırma notları.',
      count: (data.articles || []).filter(
        (item) =>
          item.locale === 'tr' && isContentPublished(item.status, item.publishedAt)
      ).length,
      icon: FileText,
    },
  ];

  return (
    <section aria-labelledby="academic-archives-heading" className="mt-10 scroll-mt-20 overflow-hidden rounded-3xl border border-academic-border bg-academic-surface p-5 shadow-sm sm:p-7 md:p-9">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-700">Keşfet</p>
        <h2 id="academic-archives-heading" className="mt-2 font-serif text-2xl font-bold tracking-tight text-academic-ink md:text-3xl">Akademik içerik arşivleri</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-academic-slate">Yayın, araştırma projesi ve yazıların tamamına düzenli, aranabilir ve güncel arşivlerden ulaşın.</p>
      </div>

      <div className="mx-auto mt-7 grid max-w-3xl gap-3 md:grid-cols-3">
        {archives.map((archive) => {
          const Icon = archive.icon;
          return (
            <Link key={archive.href} href={archive.href} className="group flex min-h-52 flex-col items-center justify-between rounded-2xl border border-academic-border bg-academic-surface-muted p-5 text-center transition duration-200 hover:-translate-y-1 hover:border-academic-slate/50 hover:bg-academic-border/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600">
              <div>
                <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-academic-border bg-academic-surface text-academic-ink shadow-sm">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-serif text-lg font-bold text-academic-ink">{archive.label}</h3>
                <p className="mt-2 text-xs leading-6 text-academic-slate">{archive.description}</p>
              </div>
              <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-black text-academic-ink">
                {archive.count} kayıt
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
