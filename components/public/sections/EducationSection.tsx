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
          <div key={item.id || index} className="relative pl-7 border-l-2 border-[#ded9cb]">
            {/* Timeline Dot */}
            <div
              className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-[#faf8f4] ring-4 ring-[#efece4] ${
                item.isCurrent || item.status === 'Devam Ediyor'
                  ? 'bg-[#1c2128]'
                  : 'bg-[#b0a999]'
              }`}
            />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <h3 className="font-bold text-[#24211e] text-base md:text-lg">
                {item.degree}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide px-2.5 py-1 bg-[#efece4] border border-[#ded9cb] rounded-lg text-[#57534e] w-fit">
                <Calendar className="w-3 h-3 text-[#78716c]" />
                {item.years}
              </span>
            </div>
            <p className="text-[#57534e] text-sm mt-1 font-medium">
              {item.institution}
            </p>
            {item.description && (
              <p className="text-[#78716c] text-xs md:text-sm mt-2 leading-relaxed">
                {item.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </AcademicCard>
  );
};
