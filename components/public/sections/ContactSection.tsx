'use client';

import React, { useState } from 'react';
import { Mail, Send, Check, Copy, MapPin } from 'lucide-react';
import { Profile } from '@/lib/types';
import { AcademicCard } from '../AcademicCard';

interface ContactSectionProps {
  profile: Profile;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ profile }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = () => {
    if (profile.email) {
      navigator.clipboard.writeText(profile.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AcademicCard
      id="iletisim"
      title="İletişim"
      icon={Mail}
      className="bg-slate-50 border-none shadow-none"
    >
      <div className="text-center py-4 space-y-6 max-w-lg mx-auto">
        <p className="text-slate-600 text-sm md:text-base leading-relaxed">
          Akademik davetler, seminerler, proje işbirlikleri ve görüş alışverişi için e-posta adresi üzerinden iletişime geçebilirsiniz:
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={`mailto:${profile.email}`}
            className="inline-flex items-center justify-center gap-3 py-3.5 px-8 bg-academic-navy text-white rounded-full font-bold shadow-lg shadow-academic-navy/20 hover:bg-academic-blue transition-all active:scale-95 text-sm md:text-base w-full sm:w-auto"
          >
            <Send className="w-4 h-4" />
            <span>{profile.email}</span>
          </a>

          <button
            onClick={handleCopyEmail}
            aria-label="E-postayı kopyala"
            className="inline-flex items-center justify-center gap-2 py-3.5 px-5 bg-white border border-slate-200 text-slate-700 rounded-full font-semibold text-xs md:text-sm hover:bg-slate-100 transition-colors shadow-sm w-full sm:w-auto"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Kopyalandı!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span>Adresi Kopyala</span>
              </>
            )}
          </button>
        </div>

        {profile.location && (
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium pt-2">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span>{profile.location}</span>
          </div>
        )}
      </div>
    </AcademicCard>
  );
};
