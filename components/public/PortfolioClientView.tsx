import React from 'react';
import Link from 'next/link';
import { PortfolioData } from '@/lib/types';
import { DesktopSidebar } from '@/components/public/DesktopSidebar';
import { MobileHeader } from '@/components/public/MobileHeader';
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

interface PortfolioClientViewProps {
  initialData: PortfolioData;
}

export const PortfolioClientView: React.FC<PortfolioClientViewProps> = ({ initialData }) => {
  const data = initialData;
  const { profile, education, publications, projects, conferences, activities, references, socialLinks } = data;

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-stone-800 font-sans antialiased flex flex-col selection:bg-amber-200">
      {/* JSON-LD Structured Data for SEO */}
      <JsonLdSchema data={data} />

      {/* Desktop Navigation Sidebar */}
      <DesktopSidebar
        profile={profile}
      />

      {/* Mobile Sticky Navigation Header */}
      <MobileHeader
        profile={profile}
      />

      {/* Main Content Centering Wrapper */}
      <div className="flex-1 lg:pl-72 flex flex-col items-center w-full">
        <main className="w-full max-w-4xl px-4 sm:px-6 md:px-8 lg:px-12 pt-20 lg:pt-16 pb-16">
          {/* Top Profile Hero for Mobile */}
          <ProfileHero
            profile={profile}
          />

          {/* Single visible page heading on every viewport */}
          <header className="mx-auto mb-10 flex max-w-2xl flex-col items-center border-b border-stone-200/80 pb-7 text-center lg:mb-12 lg:pb-8">
            <h1 className="mb-3 font-serif text-3xl font-bold tracking-tight text-stone-900 md:text-4xl lg:text-5xl">
              {profile.fullName} — Akademik Özgeçmiş
            </h1>
            <p className="text-base md:text-lg text-stone-600 font-sans leading-relaxed">
              {profile.subtitle}
            </p>
          </header>

          {/* Stacked Academic Section Cards */}
          <AboutSection profile={profile} socialLinks={socialLinks} />
          <EducationSection education={education} />
          <PublicationsSection publications={publications.filter((item) => (item.locale || 'tr') === 'tr')} />
          <ProjectsSection projects={projects.filter((item) => (item.locale || 'tr') === 'tr')} />
          <ConferencesSection conferences={conferences} />
          <ActivitiesSection activities={activities} />
          <ReferencesSection references={references} />
          <ContactSection profile={profile} />

          {/* Minimalist Footer */}
          <footer className="mt-12 border-t border-stone-200/60 py-6 text-center text-xs font-medium text-stone-600">
            © {new Date().getFullYear()} {profile.fullName}
            <span aria-hidden="true"> · </span>
            <Link href="/gizlilik" className="underline underline-offset-2">Gizlilik ve çerezler</Link>
          </footer>
        </main>
      </div>

    </div>
  );
};
