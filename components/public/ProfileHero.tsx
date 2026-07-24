'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Profile } from '@/lib/types';
import { MapPin, User } from 'lucide-react';

interface ProfileHeroProps {
  profile: Profile;
}

export const ProfileHero: React.FC<ProfileHeroProps> = ({ profile }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <section className="lg:hidden text-center pt-4 pb-6">
      <div className="relative inline-block mb-4">
        <div className="w-32 h-32 md:w-36 md:h-36 aspect-square rounded-full overflow-hidden border-4 border-white shadow-xl ring-1 ring-slate-200 shrink-0 mx-auto flex items-center justify-center bg-slate-100 relative">
          {profile.avatarUrl && !imgError ? (
            <Image
              src={profile.avatarUrl}
              alt={profile.fullName}
              fill
              sizes="(max-width: 768px) 128px, 144px"
              className="object-cover rounded-full w-full h-full"
              unoptimized
              onError={() => setImgError(true)}
              priority
            />
          ) : (
            <div className="w-full h-full bg-academic-navy text-white flex items-center justify-center text-3xl font-serif rounded-full">
              {profile.fullName.charAt(0)}
            </div>
          )}
        </div>
      </div>
      <h1 className="font-serif text-2xl md:text-3xl font-bold text-academic-navy mb-1 uppercase tracking-wide">
        {profile.fullName}
      </h1>
      <p className="font-sans text-academic-slate text-sm md:text-base font-medium max-w-md mx-auto">
        {profile.title}
      </p>

      {profile.location && (
        <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-600 font-medium">
          <MapPin className="w-3.5 h-3.5 text-academic-slate" />
          <span>{profile.location}</span>
        </div>
      )}
    </section>
  );
};
