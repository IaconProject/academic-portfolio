import React from 'react';
import Link from 'next/link';
import { BookOpen, Calendar, ExternalLink } from 'lucide-react';
import { PublicationItem } from '@/lib/types';
import { isContentPublished, publicationSlug } from '@/lib/seo';
import { AcademicCard } from '../AcademicCard';

interface PublicationsSectionProps {
  publications: PublicationItem[];
}

export const PublicationsSection: React.FC<PublicationsSectionProps> = ({ publications }) => {
  return (
    <AcademicCard id="yayinlar" title="Yayınlar" icon={BookOpen}>
      <div className="space-y-4">
        {publications.map((pub) => (
          <div
            key={pub.id}
            className="p-5 bg-academic-surface-muted rounded-xl border border-academic-border transition-all hover:bg-[#e3d9ca]"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-semibold text-[#2c2825] bg-[#efece4] px-2.5 py-0.5 rounded-md border border-[#ded9cb]">
                {pub.type}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-academic-slate font-medium">
                <Calendar className="w-3.5 h-3.5 text-[#a19b8f]" />
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

            {pub.url && pub.url !== '#' && (
              <a
                href={pub.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-[#1c2128] hover:underline"
              >
                <span>Yayını İncele</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        ))}
        <Link
          href="/yayinlar"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#1c2128] hover:underline"
        >
          Tüm yayınları görüntüle
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </AcademicCard>
  );
};
