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
      className={`bg-academic-surface rounded-2xl shadow-sm border border-academic-border p-6 md:p-8 mb-8 transition-all duration-200 hover:shadow-md ${className}`}
    >
      <div className="flex items-center justify-between border-b border-academic-border pb-4 mb-6">
        <div className="flex items-center gap-3 text-academic-ink">
          <div className="p-2.5 bg-academic-surface-muted rounded-xl text-academic-ink border border-academic-border">
            <Icon className="w-5 h-5" />
          </div>
          <h2 className="font-serif text-xl md:text-2xl font-bold tracking-tight text-academic-ink">
            {title}
          </h2>
        </div>
        {actionButton}
      </div>
      {children}
    </section>
  );
};
