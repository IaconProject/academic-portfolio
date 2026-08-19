import React from 'react';
import Link from 'next/link';
import { BookOpen, Calendar, ExternalLink } from 'lucide-react';
import { PublicationItem } from '@/lib/types';
import { isContentPublished, publicationSlug } from '@/lib/seo';
import { safeHttpUrl } from '@/lib/url-security';
import { AcademicCard } from '../AcademicCard';

interface PublicationsSectionProps {
  publications: PublicationItem[];
}

export const PublicationsSection: React.FC<PublicationsSectionProps> = ({ publications }) => {
  return (
    <AcademicCard id="yayinlar" title="Yayınlar" icon={BookOpen}>
      <div className="space-y-4">
        {publications.map((pub) => {
          const sourceUrl = safeHttpUrl(pub.url);
          return (
          <div
            key={pub.id}
            className="p-5 bg-academic-surface-muted rounded-xl border border-academic-border transition-all hover:bg-academic-border/40"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-semibold text-academic-ink bg-academic-surface px-2.5 py-0.5 rounded-md border border-academic-border">
                {pub.type}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-academic-slate font-medium">
                <Calendar className="w-3.5 h-3.5 text-academic-slate/60" />
                <span>{pub.year}</span>
              </div>
            </div>

            <h3 className="font-serif font-bold text-academic-ink text-base md:text-lg leading-snug mb-2">
              {isContentPublished(pub.detailStatus, pub.publishedAt) ? (
                <Link
                  href={`/yayinlar/${publicationSlug(pub)}`}
                  className="hover:underline"
                >
                  &quot;{pub.title}&quot;
                </Link>
              ) : (
                <>&quot;{pub.title}&quot;</>
              )}
            </h3>

            {pub.publisher && (
              <p className="text-academic-slate text-xs md:text-sm italic">
                {pub.publisher}
              </p>
            )}

            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-academic-ink hover:underline"
              >
                <span>Yayını İncele</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          );
        })}
        <Link
          href="/yayinlar"
          className="inline-flex items-center gap-1 text-xs font-bold text-academic-ink hover:underline"
        >
          Tüm yayınları görüntüle
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </AcademicCard>
  );
};
