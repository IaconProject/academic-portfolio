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
          <div key={conf.id} className="p-5 bg-[#f5f2ea]/80 rounded-xl border border-[#e6e2d5]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
              <span className="text-[11px] font-semibold text-[#2c2825] bg-[#efece4] px-2.5 py-0.5 rounded-md border border-[#ded9cb] w-fit">
                {conf.role || 'Bildiri Sunumu'}
              </span>
              <span className="text-xs text-[#78716c] font-medium inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {conf.year}
              </span>
            </div>

            <h3 className="font-serif font-bold text-[#24211e] text-base md:text-lg mb-1">
              {conf.title}
            </h3>

            <p className="text-[#57534e] text-xs md:text-sm font-medium">
              {conf.eventName}
            </p>

            {conf.location && (
              <div className="inline-flex items-center gap-1 text-xs text-[#78716c] mt-2">
                <MapPin className="w-3.5 h-3.5 text-[#a19b8f]" />
                <span>{conf.location}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </AcademicCard>
  );
};
