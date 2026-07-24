'use client';

import React from 'react';
import { GitBranch, Tag, Calendar } from 'lucide-react';
import { ProjectItem } from '@/lib/types';
import { AcademicCard } from '../AcademicCard';

interface ProjectsSectionProps {
  projects: ProjectItem[];
}

export const ProjectsSection: React.FC<ProjectsSectionProps> = ({ projects }) => {
  return (
    <AcademicCard id="projeler" title="Projeler" icon={GitBranch}>
      <div className="space-y-6">
        {projects.map((project, idx) => (
          <React.Fragment key={project.id}>
            {idx > 0 && <hr className="border-slate-100 my-6" />}
            <div className="group">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                <h3 className="font-bold text-academic-navy text-base md:text-lg">
                  {project.title}
                </h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full w-fit">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {project.years}
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-3 text-justify font-sans">
                {project.description}
              </p>

              {project.tags && project.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {project.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200/60"
                    >
                      <Tag className="w-3 h-3 text-slate-400" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </React.Fragment>
        ))}
      </div>
    </AcademicCard>
  );
};
