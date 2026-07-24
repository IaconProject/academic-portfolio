'use client';

import React from 'react';
import { Mic, MapPin, Calendar } from 'lucide-react';
import { ConferenceItem } from '@/lib/types';
import { AcademicCard } from '../AcademicCard';

interface ConferencesSectionProps {
  conferences: ConferenceItem[];
}

export const ConferencesSection: React.FC<ConferencesSectionProps> = ({ conferences }) => {
  return (
    <AcademicCard id="sempozyum" title="Sempozyum & Konferans" icon={Mic}>
      <div className="space-y-4">
        {conferences.map((conf) => (
          <div key={conf.id} className="p-5 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-academic-navy bg-white px-2.5 py-0.5 rounded border border-slate-200 w-fit">
                {conf.role || 'Bildiri Sunumu'}
              </span>
              <span className="text-xs text-slate-500 font-medium inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {conf.year}
              </span>
            </div>

            <h3 className="font-serif font-bold text-academic-navy text-base md:text-lg mb-1">
              {conf.title}
            </h3>

            <p className="text-slate-600 text-xs md:text-sm font-medium">
              {conf.eventName}
            </p>

            {conf.location && (
              <div className="inline-flex items-center gap-1 text-xs text-slate-500 mt-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{conf.location}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </AcademicCard>
  );
};
