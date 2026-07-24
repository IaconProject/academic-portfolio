import React from 'react';
import { LucideIcon } from 'lucide-react';

interface AcademicCardProps {
  id: string;
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
  actionButton?: React.ReactNode;
}

export const AcademicCard: React.FC<AcademicCardProps> = ({
  id,
  title,
  icon: Icon,
  children,
  className = '',
  actionButton,
}) => {
  return (
    <section
      id={id}
      className={`bg-white rounded-xl shadow-sm border border-slate-200/80 p-6 md:p-8 mb-8 transition-all duration-200 hover:shadow-md ${className}`}
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
        <div className="flex items-center gap-3 text-academic-navy">
          <div className="p-2 bg-slate-100 rounded-lg text-academic-navy">
            <Icon className="w-5 h-5" />
          </div>
          <h2 className="font-serif text-xl md:text-2xl font-bold tracking-tight">
            {title}
          </h2>
        </div>
        {actionButton}
      </div>
      {children}
    </section>
  );
};
