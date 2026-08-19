import React from 'react';
import { User, ExternalLink, Linkedin, Github, FileText, Instagram, Twitter, Youtube, Globe, BookOpen } from 'lucide-react';
import { Profile, SocialLink } from '@/lib/types';
import { AcademicCard } from '../AcademicCard';
import { safeHttpUrl } from '@/lib/url-security';

interface AboutSectionProps {
  profile: Profile;
  socialLinks: SocialLink[];
  subjectName?: string;
}

export const AboutSection: React.FC<AboutSectionProps> = ({
  profile,
  socialLinks,
  subjectName = profile.fullName,
}) => {
  const getSocialIcon = (platform: string, iconName?: string) => {
    const name = (iconName || platform).toLowerCase();
    if (name.includes('instagram')) return <Instagram className="w-4 h-4 text-pink-700" />;
    if (name.includes('linkedin')) return <Linkedin className="w-4 h-4 text-blue-700" />;
    if (name.includes('github')) return <Github className="w-4 h-4 text-academic-ink" />;
    if (name.includes('twitter') || name.includes('x')) return <Twitter className="w-4 h-4 text-sky-700" />;
    if (name.includes('youtube')) return <Youtube className="w-4 h-4 text-rose-700" />;
    if (name.includes('orcid') || name.includes('file')) return <FileText className="w-4 h-4 text-emerald-800" />;
    if (name.includes('scholar') || name.includes('book')) return <BookOpen className="w-4 h-4 text-amber-800" />;
    if (name.includes('globe') || name.includes('site') || name.includes('web')) return <Globe className="w-4 h-4 text-blue-700" />;
    return <ExternalLink className="w-4 h-4 text-academic-slate" />;
  };

  return (
    <AcademicCard id="hakkinda" title="Muhammed Akan Kimdir?" icon={User}>
      <p className="mb-4 text-base leading-relaxed text-academic-ink md:text-lg">
        <strong>{subjectName}</strong>,{' '}
        {profile.title.toLocaleLowerCase('tr-TR')}. {profile.subtitle}
      </p>
      <p className="text-academic-slate text-base md:text-lg leading-relaxed mb-6 font-sans text-justify">
        {profile.bio}
      </p>

      {/* Social & Academic Buttons */}
      <div className="flex flex-wrap gap-3 mt-6 pt-5 border-t border-academic-border">
        {socialLinks.map((link) => {
          const href = safeHttpUrl(link.url);
          if (!href) return null;
          return (
          <a
            key={link.id}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-2.5 py-3 px-4 bg-academic-surface-muted hover:bg-academic-border/40 border border-academic-border rounded-xl text-xs md:text-sm font-semibold text-academic-ink transition-all duration-150 active:scale-95 shadow-sm"
          >
            {getSocialIcon(link.platform, link.iconName)}
            <span>{link.platform}</span>
          </a>
          );
        })}
      </div>
    </AcademicCard>
  );
};
