import React from 'react';
import { School, Calendar } from 'lucide-react';
import { EducationItem } from '@/lib/types';
import { AcademicCard } from '../AcademicCard';

interface EducationSectionProps {
  education: EducationItem[];
}

export const EducationSection: React.FC<EducationSectionProps> = ({ education }) => {
  return (
    <AcademicCard id="egitim" title="Eğitim" icon={School}>
      <div className="space-y-6">
        {education.map((item, index) => (
          <div key={item.id || index} className="relative pl-7 border-l-2 border-academic-border">
            {/* Timeline Dot */}
            <div
              className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-academic-surface ring-4 ring-academic-surface-muted ${
                item.isCurrent || item.status === 'Devam Ediyor'
                  ? 'bg-[#1c2128]'
                  : 'bg-[#b0a999]'
              }`}
            />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <h3 className="font-bold text-academic-ink text-base md:text-lg">
                {item.degree}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide px-2.5 py-1 bg-academic-surface-muted border border-academic-border rounded-lg text-academic-slate w-fit">
                <Calendar className="w-3 h-3 text-[#78716c]" />
                {item.years}
              </span>
            </div>
            <p className="text-academic-slate text-sm mt-1 font-medium">
              {item.institution}
            </p>
            {item.description && (
              <p className="text-academic-slate text-xs md:text-sm mt-2 leading-relaxed">
                {item.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </AcademicCard>
  );
};
