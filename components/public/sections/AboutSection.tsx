'use client';

import React from 'react';
import { User, ExternalLink, Linkedin, Github, FileText } from 'lucide-react';
import { Profile, SocialLink } from '@/lib/types';
import { AcademicCard } from '../AcademicCard';

interface AboutSectionProps {
  profile: Profile;
  socialLinks: SocialLink[];
}

export const AboutSection: React.FC<AboutSectionProps> = ({ profile, socialLinks }) => {
  return (
    <AcademicCard id="hakkinda" title="Hakkında" icon={User}>
      <p className="text-academic-slate text-base md:text-lg leading-relaxed mb-6 font-sans">
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
            {link.platform === 'LinkedIn' && <Linkedin className="w-4 h-4 text-blue-600" />}
            {link.platform === 'GitHub' && <Github className="w-4 h-4 text-slate-800" />}
            {link.platform === 'ORCID' && <FileText className="w-4 h-4 text-emerald-600" />}
            {['LinkedIn', 'GitHub', 'ORCID'].includes(link.platform) ? null : <ExternalLink className="w-4 h-4 text-slate-500" />}
            <span>{link.platform}</span>
          </a>
        ))}
      </div>
    </AcademicCard>
  );
};
