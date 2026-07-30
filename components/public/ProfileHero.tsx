import React from 'react';
import Image from 'next/image';
import { Profile } from '@/lib/types';
import { MapPin } from 'lucide-react';

interface ProfileHeroProps {
  profile: Profile;
}

export const ProfileHero: React.FC<ProfileHeroProps> = ({ profile }) => {
  return (
    <section className="lg:hidden text-center pt-4 pb-6">
      <div className="relative inline-block mb-4">
        <div className="relative mx-auto flex h-32 w-32 shrink-0 aspect-square items-center justify-center overflow-hidden rounded-full border-4 border-white bg-stone-100 shadow-xl ring-1 ring-stone-200 md:h-36 md:w-36">
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
      <p className="font-serif text-2xl md:text-3xl font-bold text-stone-900 mb-1 tracking-wide">
        {profile.fullName}
      </p>
      <p className="font-sans text-stone-600 text-sm md:text-base font-medium max-w-md mx-auto">
        {profile.title}
      </p>

      {profile.location && (
        <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-[#eae6dc] rounded-full text-xs text-stone-700 font-medium">
          <MapPin className="w-3.5 h-3.5 text-stone-500" />
          <span>{profile.location}</span>
        </div>
      )}
    </section>
  );
};
