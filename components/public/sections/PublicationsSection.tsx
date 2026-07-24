'use client';

import React from 'react';
import { BookOpen, Calendar, ExternalLink } from 'lucide-react';
import { PublicationItem } from '@/lib/types';
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
            className="p-5 bg-slate-50 rounded-xl border border-slate-200/80 transition-all hover:bg-slate-100/70"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-academic-slate bg-white px-2.5 py-0.5 rounded border border-slate-200">
                {pub.type}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{pub.year}</span>
              </div>
            </div>

            <h3 className="font-serif font-bold text-academic-navy text-base md:text-lg leading-snug mb-2">
              &quot;{pub.title}&quot;
            </h3>

            {pub.publisher && (
              <p className="text-slate-600 text-xs md:text-sm italic">
                {pub.publisher}
              </p>
            )}

            {pub.url && pub.url !== '#' && (
              <a
                href={pub.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-academic-navy hover:underline"
              >
                <span>Yayını İncele</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        ))}
      </div>
    </AcademicCard>
  );
};
