import { NextResponse } from 'next/server';
import { initialPortfolioData } from '@/lib/initial-data';
import { PortfolioData } from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TMP_FILE_PATH = path.join('/tmp', 'academic_portfolio_data_v2.json');

function readTmpStore(): PortfolioData {
  try {
    if (fs.existsSync(TMP_FILE_PATH)) {
      const content = fs.readFileSync(TMP_FILE_PATH, 'utf-8');
      if (content) return JSON.parse(content);
    }
  } catch (e) {
    console.error('Failed reading tmp store:', e);
  }
  return initialPortfolioData;
}

function writeTmpStore(data: PortfolioData): void {
  try {
    fs.writeFileSync(TMP_FILE_PATH, JSON.stringify(data), 'utf-8');
  } catch (e) {
    console.error('Failed writing tmp store:', e);
  }
}

export async function GET() {
  const currentTmp = readTmpStore();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: profileData } = await supabase.from('public_profile').select('*').maybeSingle();
      if (profileData) {
        const { data: eduData } = await supabase.from('education').select('*');
        const { data: pubData } = await supabase.from('publications').select('*');
        const { data: projData } = await supabase.from('projects').select('*');
        const { data: confData } = await supabase.from('conferences').select('*');
        const { data: actData } = await supabase.from('activities').select('*');
        const { data: refData } = await supabase.from('references_list').select('*');
        const { data: socData } = await supabase.from('social_links').select('*');
        const { data: seoData } = await supabase.from('seo_settings').select('*').maybeSingle();

        const fetchedData: PortfolioData = {
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
          education: (eduData && eduData.length > 0) ? eduData.map((e: any) => ({
            id: e.id,
            degree: e.degree,
            institution: e.institution,
            years: e.years,
            status: e.status,
            description: e.description,
            isCurrent: e.is_current,
          })) : currentTmp.education,
          publications: (pubData && pubData.length > 0) ? pubData.map((p: any) => ({
            id: p.id,
            type: p.type,
            title: p.title,
            publisher: p.publisher,
            year: p.year,
            url: p.url,
          })) : currentTmp.publications,
          projects: (projData && projData.length > 0) ? projData.map((pr: any) => ({
            id: pr.id,
            title: pr.title,
            description: pr.description,
            years: pr.years,
            tags: pr.tags || [],
          })) : currentTmp.projects,
          conferences: (confData && confData.length > 0) ? confData : currentTmp.conferences,
          activities: (actData && actData.length > 0) ? actData : currentTmp.activities,
          references: (refData && refData.length > 0) ? refData : currentTmp.references,
          socialLinks: (socData && socData.length > 0) ? socData : currentTmp.socialLinks,
          seoSettings: seoData ? {
            metaTitle: seoData.meta_title,
            metaDescription: seoData.meta_description,
            keywords: seoData.keywords,
            ogImageUrl: seoData.og_image_url,
            canonicalUrl: seoData.canonical_url,
            authorName: seoData.author_name,
          } : currentTmp.seoSettings,
        };

        writeTmpStore(fetchedData);
        return NextResponse.json(fetchedData, {
          headers: { 'Cache-Control': 'no-store, max-age=0' },
        });
      }
    } catch (e) {
      console.warn('Supabase fetch error, returning tmp store:', e);
    }
  }

  return NextResponse.json(currentTmp, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.adminCredentials && isSupabaseConfigured && supabase) {
      try {
        await supabase.from('admin_credentials').upsert({
          email: body.adminCredentials.email,
          password: body.adminCredentials.password,
        });
      } catch (e) {
        // Table might not exist yet, suppress console error
      }
    }

    if (body.profile) {
      const updatedData: PortfolioData = body;
      writeTmpStore(updatedData);

      if (isSupabaseConfigured && supabase) {
        try {
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

          await supabase.from('seo_settings').upsert({
            meta_title: updatedData.seoSettings.metaTitle,
            meta_description: updatedData.seoSettings.metaDescription,
            keywords: updatedData.seoSettings.keywords,
            og_image_url: updatedData.seoSettings.ogImageUrl,
            canonical_url: updatedData.seoSettings.canonicalUrl,
            author_name: updatedData.seoSettings.authorName,
          });
        } catch (e) {
          console.warn('Supabase upsert warning:', e);
        }
      }
    }

    return NextResponse.json({ success: true, data: readTmpStore() }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
