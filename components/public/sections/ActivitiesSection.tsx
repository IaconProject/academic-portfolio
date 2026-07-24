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
          <div key={act.id} className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
              <h3 className="font-bold text-academic-navy text-base">
                {act.title}
              </h3>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full w-fit">
                {act.years}
              </span>
            </div>
            <p className="text-xs md:text-sm text-academic-slate font-medium mb-2">
              {act.organization}
            </p>
            {act.description && (
              <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
                {act.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </AcademicCard>
  );
};
