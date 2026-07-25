'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Profile } from '@/lib/types';
import { MapPin, ZoomIn } from 'lucide-react';

interface ProfileHeroProps {
  profile: Profile;
  onOpenAvatar?: (url: string) => void;
}

export const ProfileHero: React.FC<ProfileHeroProps> = ({ profile, onOpenAvatar }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <section className="lg:hidden text-center pt-4 pb-6">
      <div className="relative inline-block mb-4">
        <div
          onClick={() => profile.avatarUrl && !imgError && onOpenAvatar?.(profile.avatarUrl)}
          className="w-32 h-32 md:w-36 md:h-36 aspect-square rounded-full overflow-hidden border-4 border-white shadow-xl ring-1 ring-stone-200 shrink-0 mx-auto flex items-center justify-center bg-stone-100 relative cursor-pointer group"
          title="Fotoğrafı Büyüt"
        >
          {profile.avatarUrl && !imgError ? (
            <>
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
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <ZoomIn className="w-6 h-6" />
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-[#1c2128] text-white flex items-center justify-center text-3xl font-serif rounded-full">
              {profile.fullName.charAt(0)}
            </div>
          )}
        </div>
      </div>
      <h1 className="font-serif text-2xl md:text-3xl font-bold text-stone-900 mb-1 tracking-wide">
        {profile.fullName}
      </h1>
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
