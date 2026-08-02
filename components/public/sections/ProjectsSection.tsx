import React from 'react';
import Link from 'next/link';
import { GitBranch, Tag, Calendar } from 'lucide-react';
import { ProjectItem } from '@/lib/types';
import { isContentPublished, projectSlug } from '@/lib/seo';
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
            {idx > 0 && <hr className="border-academic-border my-6" />}
            <div className="group">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                <h3 className="font-bold text-academic-ink text-base md:text-lg">
                  {isContentPublished(project.detailStatus, project.publishedAt) ? (
                    <Link
                      href={`/projeler/${projectSlug(project)}`}
                      className="hover:underline"
                    >
                      {project.title}
                    </Link>
                  ) : (
                    project.title
                  )}
                </h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-academic-slate bg-academic-surface-muted px-2.5 py-1 rounded-lg border border-academic-border w-fit">
                  <Calendar className="w-3 h-3 text-[#78716c]" />
                  {project.years}
                </span>
              </div>
              <p className="text-sm text-academic-slate leading-relaxed mb-3 text-justify font-sans">
                {project.description}
              </p>

              {project.tags && project.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {project.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold bg-academic-surface-muted text-academic-ink px-2.5 py-1 rounded-lg border border-academic-border hover:border-[#a99d89] transition-colors"
                    >
                      <Tag className="w-3 h-3 text-[#78716c]" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </React.Fragment>
        ))}
        <Link
          href="/projeler"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#1c2128] hover:underline"
        >
          Tüm projeleri görüntüle
        </Link>
      </div>
    </AcademicCard>
  );
};
