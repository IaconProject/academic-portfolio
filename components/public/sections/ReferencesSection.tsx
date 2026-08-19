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
          const isFeatured = idx === 0;
          return (
            <div
              key={ref.id}
              className={`p-5 rounded-xl transition-all duration-150 ${
                isFeatured
                  ? 'border border-academic-accent/30 bg-academic-accent-soft text-academic-ink shadow-md'
                  : 'bg-academic-surface-muted border border-academic-border text-academic-ink shadow-sm hover:bg-academic-border/40'
              }`}
            >
              <h3 className="font-serif text-base font-bold text-academic-ink md:text-lg">
                {ref.name}
              </h3>
              <p className="mt-1 text-xs font-medium text-academic-slate">
                {ref.title}
              </p>
              <div className={`mt-3 flex items-center gap-1.5 border-t pt-3 text-xs text-academic-slate ${isFeatured ? 'border-academic-accent/25' : 'border-academic-border'}`}>
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
