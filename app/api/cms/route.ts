import { NextResponse } from 'next/server';
import { initialPortfolioData } from '@/lib/initial-data';
import { PortfolioData } from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

let inMemoryStore: PortfolioData = initialPortfolioData;

export async function GET() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: profileData } = await supabase.from('public_profile').select('*').single();
      if (profileData) {
        // Map from Supabase DB to PortfolioData schema
        const { data: eduData } = await supabase.from('education').select('*');
        const { data: pubData } = await supabase.from('publications').select('*');
        const { data: projData } = await supabase.from('projects').select('*');
        const { data: confData } = await supabase.from('conferences').select('*');
        const { data: actData } = await supabase.from('activities').select('*');
        const { data: refData } = await supabase.from('references_list').select('*');
        const { data: socData } = await supabase.from('social_links').select('*');
        const { data: seoData } = await supabase.from('seo_settings').select('*').single();

        return NextResponse.json({
          profile: {
            fullName: profileData.full_name,
            title: profileData.title,
            subtitle: profileData.subtitle || '',
            bio: profileData.bio,
            avatarUrl: profileData.avatar_url,
            email: profileData.email,
            location: profileData.location || '',
            cvUrl: profileData.cv_url || '#',
          },
          education: (eduData || []).map((e: any) => ({
            id: e.id,
            degree: e.degree,
            institution: e.institution,
            years: e.years,
            status: e.status,
            description: e.description,
            isCurrent: e.is_current,
          })),
          publications: (pubData || []).map((p: any) => ({
            id: p.id,
            type: p.type,
            title: p.title,
            publisher: p.publisher,
            year: p.year,
            url: p.url,
          })),
          projects: (pr: any) => ({
            id: pr.id,
            title: pr.title,
            description: pr.description,
            years: pr.years,
            tags: pr.tags || [],
          }),
          conferences: (confData || []),
          activities: (actData || []),
          references: (refData || []),
          socialLinks: (socData || []),
          seoSettings: seoData || inMemoryStore.seoSettings,
        });
      }
    } catch (e) {
      console.warn('Supabase fetch failed in API route, returning inMemoryStore:', e);
    }
  }

  return NextResponse.json(inMemoryStore);
}

export async function POST(request: Request) {
  try {
    const updatedData: PortfolioData = await request.json();
    inMemoryStore = updatedData;

    if (isSupabaseConfigured && supabase) {
      // Upsert profile
      await supabase.from('public_profile').upsert({
        full_name: updatedData.profile.fullName,
        title: updatedData.profile.title,
        subtitle: updatedData.profile.subtitle,
        bio: updatedData.profile.bio,
        avatar_url: updatedData.profile.avatarUrl,
        email: updatedData.profile.email,
        location: updatedData.profile.location,
        cv_url: updatedData.profile.cvUrl,
      });

      // Upsert SEO settings
      await supabase.from('seo_settings').upsert({
        meta_title: updatedData.seoSettings.metaTitle,
        meta_description: updatedData.seoSettings.metaDescription,
        keywords: updatedData.seoSettings.keywords,
        og_image_url: updatedData.seoSettings.ogImageUrl,
        canonical_url: updatedData.seoSettings.canonicalUrl,
        author_name: updatedData.seoSettings.authorName,
      });
    }

    return NextResponse.json({ success: true, data: inMemoryStore });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
