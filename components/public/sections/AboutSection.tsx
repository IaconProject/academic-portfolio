'use client';

import React from 'react';
import { User, ExternalLink, Linkedin, Github, FileText, Instagram, Twitter, Youtube, Globe, BookOpen, Share2 } from 'lucide-react';
import { Profile, SocialLink } from '@/lib/types';
import { AcademicCard } from '../AcademicCard';

interface AboutSectionProps {
  profile: Profile;
  socialLinks: SocialLink[];
}

export const AboutSection: React.FC<AboutSectionProps> = ({ profile, socialLinks }) => {
  const getSocialIcon = (platform: string, iconName?: string) => {
    const name = (iconName || platform).toLowerCase();
    if (name.includes('instagram')) return <Instagram className="w-4 h-4 text-pink-600" />;
    if (name.includes('linkedin')) return <Linkedin className="w-4 h-4 text-blue-600" />;
    if (name.includes('github')) return <Github className="w-4 h-4 text-slate-800" />;
    if (name.includes('twitter') || name.includes('x')) return <Twitter className="w-4 h-4 text-cyan-500" />;
    if (name.includes('youtube')) return <Youtube className="w-4 h-4 text-red-600" />;
    if (name.includes('orcid') || name.includes('file')) return <FileText className="w-4 h-4 text-emerald-600" />;
    if (name.includes('scholar') || name.includes('book')) return <BookOpen className="w-4 h-4 text-amber-600" />;
    if (name.includes('globe') || name.includes('site') || name.includes('web')) return <Globe className="w-4 h-4 text-blue-500" />;
    return <ExternalLink className="w-4 h-4 text-slate-600" />;
  };

  return (
    <AcademicCard id="hakkinda" title="Hakkında" icon={User}>
      <p className="text-academic-slate text-base md:text-lg leading-relaxed mb-6 font-sans text-justify">
        {profile.bio}
      </p>

      {/* Social & Academic Buttons */}
      <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-slate-100">
        {socialLinks.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-2 py-3 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs md:text-sm font-semibold text-academic-navy transition-all duration-150 active:scale-95 shadow-sm"
          >
            {getSocialIcon(link.platform, link.iconName)}
            <span>{link.platform}</span>
          </a>
        ))}
      </div>
    </AcademicCard>
  );
};
