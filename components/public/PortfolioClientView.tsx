'use client';

import React, { useEffect, useState } from 'react';
import { PortfolioData } from '@/lib/types';
import { getPortfolioData, fetchPortfolioFromSupabase, savePortfolioDataLocally } from '@/lib/cms-store';
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
  const [data, setData] = useState<PortfolioData>(initialData);
  const [activeSection, setActiveSection] = useState<string>('hakkinda');

  useEffect(() => {
    // Check if client local storage has avatar / updates
    const local = getPortfolioData();
    if (local && local.profile && local.profile.fullName) {
      // If local data has custom avatar or changes, merge seamlessly
      if (local.profile.avatarUrl && local.profile.avatarUrl !== initialData.profile.avatarUrl) {
        setData((prev) => ({
          ...prev,
          profile: {
            ...prev.profile,
            avatarUrl: local.profile.avatarUrl,
          },
        }));
      }
    }

    // Quiet background sync
    fetchPortfolioFromSupabase().then((remoteData) => {
      if (remoteData && remoteData.profile) {
        setData(remoteData);
        savePortfolioDataLocally(remoteData);
      }
    });
  }, [initialData]);

  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        'hakkinda',
        'egitim',
        'yayinlar',
        'projeler',
        'sempozyum',
        'faaliyetler',
        'referanslar',
        'iletisim',
      ];

      const scrollPos = window.scrollY + 200;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { profile, education, publications, projects, conferences, activities, references, socialLinks } = data;

  return (
    <div className="min-h-screen bg-academic-bg text-slate-800 font-sans antialiased flex flex-col">
      {/* JSON-LD Structured Data for SEO */}
      <JsonLdSchema data={data} />

      {/* Desktop Navigation Sidebar */}
      <DesktopSidebar
        profile={profile}
        socialLinks={socialLinks}
        activeSection={activeSection}
      />

      {/* Mobile Sticky Navigation Header */}
      <MobileHeader
        profile={profile}
        activeSection={activeSection}
      />

      {/* Main Content Centering Wrapper */}
      <div className="flex-1 lg:pl-72 flex flex-col items-center w-full">
        <main className="w-full max-w-4xl px-4 sm:px-6 md:px-8 lg:px-12 pt-20 lg:pt-16 pb-16">
          {/* Top Profile Hero for Mobile */}
          <ProfileHero profile={profile} />

          {/* Desktop Page Title Header - Centered */}
          <header className="hidden lg:flex flex-col items-center text-center mb-12 border-b border-slate-200/60 pb-8 mx-auto max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-academic-navy mb-3 tracking-tight">
              Akademik Özgeçmiş
            </h1>
            <p className="text-base md:text-lg text-academic-slate font-sans leading-relaxed">
              {profile.subtitle}
            </p>
          </header>

          {/* Stacked Academic Section Cards */}
          <AboutSection profile={profile} socialLinks={socialLinks} />
          <EducationSection education={education} />
          <PublicationsSection publications={publications} />
          <ProjectsSection projects={projects} />
          <ConferencesSection conferences={conferences} />
          <ActivitiesSection activities={activities} />
          <ReferencesSection references={references} />
          <ContactSection profile={profile} />

          {/* Footer */}
          <footer className="text-center py-8 opacity-60 text-xs font-bold uppercase tracking-widest text-slate-500 border-t border-slate-200/50 mt-12">
            © {new Date().getFullYear()} {profile.fullName} | Tüm Hakları Saklıdır
          </footer>
        </main>
      </div>
    </div>
  );
};
