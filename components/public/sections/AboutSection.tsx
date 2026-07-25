'use client';

import React from 'react';
import { User, ExternalLink, Linkedin, Github, FileText, Instagram, Twitter, Youtube, Globe, BookOpen } from 'lucide-react';
import { Profile, SocialLink } from '@/lib/types';
import { AcademicCard } from '../AcademicCard';

interface AboutSectionProps {
  profile: Profile;
  socialLinks: SocialLink[];
}

export const AboutSection: React.FC<AboutSectionProps> = ({ profile, socialLinks }) => {
  const getSocialIcon = (platform: string, iconName?: string) => {
    const name = (iconName || platform).toLowerCase();
    if (name.includes('instagram')) return <Instagram className="w-4 h-4 text-pink-700" />;
    if (name.includes('linkedin')) return <Linkedin className="w-4 h-4 text-blue-700" />;
    if (name.includes('github')) return <Github className="w-4 h-4 text-stone-800" />;
    if (name.includes('twitter') || name.includes('x')) return <Twitter className="w-4 h-4 text-sky-700" />;
    if (name.includes('youtube')) return <Youtube className="w-4 h-4 text-rose-700" />;
    if (name.includes('orcid') || name.includes('file')) return <FileText className="w-4 h-4 text-emerald-800" />;
    if (name.includes('scholar') || name.includes('book')) return <BookOpen className="w-4 h-4 text-amber-800" />;
    if (name.includes('globe') || name.includes('site') || name.includes('web')) return <Globe className="w-4 h-4 text-blue-700" />;
    return <ExternalLink className="w-4 h-4 text-stone-600" />;
  };

  return (
    <AcademicCard id="hakkinda" title="Hakkında" icon={User}>
      <p className="text-[#57534e] text-base md:text-lg leading-relaxed mb-6 font-sans text-justify">
        {profile.bio}
      </p>

      {/* Social & Academic Buttons */}
      <div className="flex flex-wrap gap-3 mt-6 pt-5 border-t border-[#ece8dc]">
        {socialLinks.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-2.5 py-3 px-4 bg-[#efece4] hover:bg-[#e5e1d5] border border-[#ded9cb] rounded-xl text-xs md:text-sm font-semibold text-[#2c2825] transition-all duration-150 active:scale-95 shadow-sm"
          >
            {getSocialIcon(link.platform, link.iconName)}
            <span>{link.platform}</span>
          </a>
        ))}
      </div>
    </AcademicCard>
  );
};
