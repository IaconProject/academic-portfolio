'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
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
  const [zoomAvatarUrl, setZoomAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const local = getPortfolioData();
    if (local && local.profile && local.profile.fullName) {
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
    <div className="min-h-screen bg-[#f7f5f0] text-stone-800 font-sans antialiased flex flex-col selection:bg-amber-200">
      {/* JSON-LD Structured Data for SEO */}
      <JsonLdSchema data={data} />

      {/* Desktop Navigation Sidebar */}
      <DesktopSidebar
        profile={profile}
        socialLinks={socialLinks}
        activeSection={activeSection}
        onOpenAvatar={(url) => setZoomAvatarUrl(url)}
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
          <ProfileHero
            profile={profile}
            onOpenAvatar={(url) => setZoomAvatarUrl(url)}
          />

          {/* Desktop Page Title Header - Centered */}
          <header className="hidden lg:flex flex-col items-center text-center mb-12 border-b border-stone-200/80 pb-8 mx-auto max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-stone-900 mb-3 tracking-tight">
              Akademik Özgeçmiş
            </h1>
            <p className="text-base md:text-lg text-stone-600 font-sans leading-relaxed">
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

          {/* Minimalist Footer */}
          <footer className="text-center py-6 text-[11px] font-medium text-stone-500 border-t border-stone-200/60 mt-12">
            © {new Date().getFullYear()} {profile.fullName}
          </footer>
        </main>
      </div>

      {/* Profile Picture Lightbox Zoom Modal */}
      {zoomAvatarUrl && (
        <div
          onClick={() => setZoomAvatarUrl(null)}
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-72 h-72 sm:w-96 sm:h-96 md:w-[420px] md:h-[420px] aspect-square rounded-2xl overflow-hidden border-4 border-white/20 shadow-2xl bg-stone-900 transition-transform duration-300"
          >
            <Image
              src={zoomAvatarUrl}
              alt={profile.fullName}
              fill
              className="object-cover"
              unoptimized
            />
            <button
              onClick={() => setZoomAvatarUrl(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
