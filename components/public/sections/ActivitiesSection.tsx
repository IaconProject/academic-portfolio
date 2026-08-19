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
          <div key={act.id} className="p-5 bg-academic-surface-muted rounded-xl border border-academic-border transition-all hover:bg-academic-border/40 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
              <h3 className="font-bold text-academic-ink text-base">
                {act.title}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-academic-ink bg-academic-surface px-2.5 py-0.5 rounded-md border border-academic-border w-fit">
                <Calendar className="w-3 h-3 text-academic-slate" />
                {act.years}
              </span>
            </div>
            <p className="text-xs md:text-sm text-academic-slate font-medium mb-2">
              {act.organization}
            </p>
            {act.description && (
              <p className="text-academic-slate text-xs md:text-sm leading-relaxed">
                {act.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </AcademicCard>
  );
};
