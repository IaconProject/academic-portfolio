'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import { Profile } from '@/lib/types';
import { MapPin } from 'lucide-react';
import { ANALYTICS_TRACK_EVENT } from '@/lib/analytics-contract';

interface ProfileHeroProps {
  profile: Profile;
}

export const ProfileHero: React.FC<ProfileHeroProps> = ({ profile }) => {
  const touchStartScale = useRef<number | null>(null);

  const isMobileViewport = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 1023px)').matches;

  const trackProfileInteraction = (
    contentKey:
      | 'profile_photo_click'
      | 'profile_photo_double_click'
      | 'profile_photo_zoom'
      | 'profile_photo_open_new_tab'
      | 'profile_photo_save_intent'
  ) => {
    if (!profile.avatarUrl || !isMobileViewport()) return;
    window.dispatchEvent(
      new CustomEvent(ANALYTICS_TRACK_EVENT, {
        detail: {
          eventType: 'engagement',
          contentType: 'profile_interaction',
          contentKey,
          durationMs: 1,
        },
      })
    );
  };

  return (
    <section
      aria-labelledby="profile-heading"
      className="border-b border-academic-border pb-7 pt-4 text-center lg:mb-10 lg:pt-0 lg:pb-8"
    >
      <div className="relative mb-4 inline-block lg:hidden">
        <div
          className="relative mx-auto flex h-32 w-32 shrink-0 aspect-square items-center justify-center overflow-hidden rounded-full border-4 border-academic-surface bg-academic-surface-muted shadow-xl ring-1 ring-academic-border md:h-36 md:w-36"
          aria-label="Profil fotoğrafı"
          onClick={(event) => {
            trackProfileInteraction('profile_photo_click');
            if (event.metaKey || event.ctrlKey) {
              trackProfileInteraction('profile_photo_open_new_tab');
            }
          }}
          onDoubleClick={() =>
            trackProfileInteraction('profile_photo_double_click')
          }
          onAuxClick={(event) => {
            if (event.button === 1) {
              trackProfileInteraction('profile_photo_open_new_tab');
            }
          }}
          onContextMenu={() =>
            trackProfileInteraction('profile_photo_save_intent')
          }
          onTouchStart={() => {
            if (isMobileViewport()) {
              touchStartScale.current = window.visualViewport?.scale || 1;
            }
          }}
          onTouchEnd={() => {
            const startScale = touchStartScale.current;
            touchStartScale.current = null;
            const endScale = window.visualViewport?.scale || 1;
            if (
              startScale !== null &&
              endScale - startScale >= 0.05
            ) {
              trackProfileInteraction('profile_photo_zoom');
            }
          }}
        >
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
            <div className="flex h-full w-full items-center justify-center rounded-full bg-academic-accent font-serif text-3xl text-academic-on-accent">
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
