import React from 'react';
import Link from 'next/link';
import { PortfolioData } from '@/lib/types';
import { DesktopSidebar } from '@/components/public/DesktopSidebar';
import { MobileHeader } from '@/components/public/MobileHeader';
import { AcademicArchivesSection } from '@/components/public/AcademicArchivesSection';
import { ProfileHero } from '@/components/public/ProfileHero';
import { AboutSection } from '@/components/public/sections/AboutSection';
import { EducationSection } from '@/components/public/sections/EducationSection';
import { PublicationsSection } from '@/components/public/sections/PublicationsSection';
import { ProjectsSection } from '@/components/public/sections/ProjectsSection';
import { ConferencesSection } from '@/components/public/sections/ConferencesSection';
import { ActivitiesSection } from '@/components/public/sections/ActivitiesSection';
import { ReferencesSection } from '@/components/public/sections/ReferencesSection';
import { ContactSection } from '@/components/public/sections/ContactSection';
import { JsonLdSchema } from '@/components/public/JsonLdSchema';
import { sortArchiveContent } from '@/lib/content-presentation';

interface PortfolioClientViewProps {
  initialData: PortfolioData;
}

export const PortfolioClientView: React.FC<PortfolioClientViewProps> = ({ initialData }) => {
  const data = initialData;
  const { profile, education, publications, projects, conferences, activities, references, socialLinks } = data;
  const orderedPublications = sortArchiveContent(
    publications.filter((item) => (item.locale || 'tr') === 'tr')
  );
  const orderedProjects = sortArchiveContent(
    projects.filter((item) => (item.locale || 'tr') === 'tr')
  );

  return (
    <div className="min-h-screen bg-academic-bg text-academic-ink font-sans antialiased flex flex-col selection:bg-amber-200">
      {/* JSON-LD Structured Data for SEO */}
      <JsonLdSchema data={data} />

      {/* Desktop Navigation Sidebar */}
      <DesktopSidebar
        profile={profile}
      />

      {/* Mobile Sticky Navigation Header */}
      <MobileHeader />

      {/* Main Content Centering Wrapper */}
      <div className="flex-1 lg:pl-72 flex flex-col items-center w-full">
        <main className="w-full max-w-4xl px-4 sm:px-6 md:px-8 lg:px-12 pt-20 lg:pt-16 pb-32">
          {/* Top Profile Hero for Mobile */}
          <ProfileHero
            profile={profile}
          />

          {/* Stacked Academic Section Cards */}
          <AboutSection
            profile={profile}
            socialLinks={socialLinks}
            subjectName={data.seoSettings.authorName || profile.fullName}
          />
          <EducationSection education={education} />
          <PublicationsSection publications={orderedPublications} />
          <ProjectsSection projects={orderedProjects} />
          <ConferencesSection conferences={conferences} />
          <ActivitiesSection activities={activities} />
          <ReferencesSection references={references} />
          <ContactSection
            profile={{ email: profile.email, location: profile.location }}
          />

          <AcademicArchivesSection data={data} />

          {/* Minimalist Footer */}
          <footer className="mt-12 border-t border-academic-border py-6 text-center text-xs font-medium text-academic-slate">
            © {new Date().getFullYear()} {profile.fullName}
            <span aria-hidden="true"> · </span>
            <Link href="/gizlilik" className="underline underline-offset-2">Gizlilik ve çerezler</Link>
          </footer>
        </main>
      </div>

    </div>
  );
};
