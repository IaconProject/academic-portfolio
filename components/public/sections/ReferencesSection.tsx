'use client';

import React from 'react';
import { Users, Building2, Mail, Phone } from 'lucide-react';
import { ReferenceItem } from '@/lib/types';
import { AcademicCard } from '../AcademicCard';

interface ReferencesSectionProps {
  references: ReferenceItem[];
}

export const ReferencesSection: React.FC<ReferencesSectionProps> = ({ references }) => {
  return (
    <AcademicCard id="referanslar" title="Referanslar" icon={Users}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {references.map((ref, idx) => {
          const isDark = idx === 0;
          return (
            <div
              key={ref.id}
              className={`p-5 rounded-xl transition-all duration-150 ${
                isDark
                  ? 'bg-academic-navy text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
              }`}
            >
              <h3 className={`font-serif font-bold text-base md:text-lg ${isDark ? 'text-white' : 'text-academic-navy'}`}>
                {ref.name}
              </h3>
              <p className={`text-xs mt-1 font-medium ${isDark ? 'text-slate-300' : 'text-academic-slate'}`}>
                {ref.title}
              </p>
              <div className={`flex items-center gap-1.5 text-xs mt-3 pt-3 border-t ${isDark ? 'border-white/10 text-slate-400' : 'border-slate-100 text-slate-500'}`}>
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span>{ref.institution}</span>
              </div>
              {(ref.email || ref.phone) && (
                <div className="mt-2 text-xs space-y-1">
                  {ref.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 opacity-70" />
                      <span>{ref.email}</span>
                    </div>
                  )}
                  {ref.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 opacity-70" />
                      <span>{ref.phone}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AcademicCard>
  );
};
