import React from 'react';
import Image from 'next/image';
import { Profile } from '@/lib/types';
import { MapPin } from 'lucide-react';

interface ProfileHeroProps {
  profile: Profile;
}

export const ProfileHero: React.FC<ProfileHeroProps> = ({ profile }) => {
  return (
    <section
      aria-labelledby="profile-heading"
      className="border-b border-academic-border pb-7 pt-4 text-center lg:mb-10 lg:pt-0 lg:pb-8"
    >
      <div className="relative mb-4 inline-block lg:hidden">
        <div className="relative mx-auto flex h-32 w-32 shrink-0 aspect-square items-center justify-center overflow-hidden rounded-full border-4 border-academic-surface bg-academic-surface-muted shadow-xl ring-1 ring-academic-border md:h-36 md:w-36">
          {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={profile.fullName}
                fill
                sizes="(max-width: 768px) 128px, 144px"
                className="object-cover rounded-full w-full h-full"
                priority
              />
          ) : (
            <div className="w-full h-full bg-[#1c2128] text-white flex items-center justify-center text-3xl font-serif rounded-full">
              {profile.fullName.charAt(0)}
            </div>
          )}
        </div>
      </div>
      <h1
        id="profile-heading"
        className="font-serif text-2xl md:text-3xl font-bold text-academic-ink mb-1 tracking-wide"
      >
        {profile.fullName}
      </h1>
      <p className="font-sans text-academic-slate text-sm md:text-base font-medium max-w-md mx-auto">
        {profile.title}
      </p>

      {profile.location && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-academic-surface-muted px-3 py-1 text-xs font-medium text-academic-slate lg:hidden">
          <MapPin className="w-3.5 h-3.5 text-academic-slate" />
          <span>{profile.location}</span>
        </div>
      )}
    </section>
  );
};
