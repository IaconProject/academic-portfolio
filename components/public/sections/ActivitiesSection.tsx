'use client';

import React from 'react';
import { ListOrdered, Calendar } from 'lucide-react';
import { ActivityItem } from '@/lib/types';
import { AcademicCard } from '../AcademicCard';

interface ActivitiesSectionProps {
  activities: ActivityItem[];
}

export const ActivitiesSection: React.FC<ActivitiesSectionProps> = ({ activities }) => {
  return (
    <AcademicCard id="faaliyetler" title="Faaliyetler" icon={ListOrdered}>
      <div className="space-y-4">
        {activities.map((act) => (
          <div key={act.id} className="p-5 bg-[#f5f2ea]/80 rounded-xl border border-[#e6e2d5] transition-all hover:bg-[#efece4] shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
              <h3 className="font-bold text-[#24211e] text-base">
                {act.title}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2c2825] bg-[#efece4] px-2.5 py-0.5 rounded-md border border-[#ded9cb] w-fit">
                <Calendar className="w-3 h-3 text-[#78716c]" />
                {act.years}
              </span>
            </div>
            <p className="text-xs md:text-sm text-[#57534e] font-medium mb-2">
              {act.organization}
            </p>
            {act.description && (
              <p className="text-[#78716c] text-xs md:text-sm leading-relaxed">
                {act.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </AcademicCard>
  );
};
