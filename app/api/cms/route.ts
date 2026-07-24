import { NextResponse } from 'next/server';
import { initialPortfolioData } from '@/lib/initial-data';
import { PortfolioData } from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TMP_FILE_PATH = path.join('/tmp', 'academic_portfolio_data_v2.json');

let inMemoryStore: PortfolioData | null = null;

function readTmpStore(): PortfolioData {
  if (inMemoryStore) {
    return inMemoryStore;
  }
  try {
    if (fs.existsSync(TMP_FILE_PATH)) {
      const content = fs.readFileSync(TMP_FILE_PATH, 'utf-8');
      if (content) {
        inMemoryStore = JSON.parse(content);
        return inMemoryStore!;
      }
    }
  } catch (e) {
    console.error('Failed reading tmp store:', e);
  }
  return initialPortfolioData;
}

function writeTmpStore(data: PortfolioData): void {
  inMemoryStore = data;
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
      const { data: profileRows } = await supabase
        .from('public_profile')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);

      const profileData = profileRows && profileRows.length > 0 ? profileRows[0] : null;

      if (profileData) {
        const { data: eduData } = await supabase.from('education').select('*').order('created_at', { ascending: true });
        const { data: pubData } = await supabase.from('publications').select('*').order('created_at', { ascending: true });
        const { data: projData } = await supabase.from('projects').select('*').order('created_at', { ascending: true });
        const { data: confData } = await supabase.from('conferences').select('*').order('created_at', { ascending: true });
        const { data: actData } = await supabase.from('activities').select('*').order('created_at', { ascending: true });
        const { data: refData } = await supabase.from('references_list').select('*').order('created_at', { ascending: true });
        const { data: socData } = await supabase.from('social_links').select('*').order('created_at', { ascending: true });
        const { data: seoRows } = await supabase.from('seo_settings').select('*').limit(1);
        const seoData = seoRows && seoRows.length > 0 ? seoRows[0] : null;

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
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
        });
      }
    } catch (e) {
      console.warn('Supabase fetch error, returning tmp store:', e);
    }
  }

  return NextResponse.json(currentTmp, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.adminCredentials && isSupabaseConfigured && supabase) {
      try {
        const { data: credRows } = await supabase.from('admin_credentials').select('id').limit(1);
        const existingId = credRows && credRows.length > 0 ? credRows[0].id : undefined;

        await supabase.from('admin_credentials').upsert({
          ...(existingId ? { id: existingId } : {}),
          email: body.adminCredentials.email,
          password: body.adminCredentials.password,
        });
      } catch (e) {
        // Table might not exist yet
      }
    }

    if (body.profile) {
      const updatedData: PortfolioData = body;
      writeTmpStore(updatedData);

      if (isSupabaseConfigured && supabase) {
        try {
          const { data: profRows } = await supabase.from('public_profile').select('id').limit(1);
          const existingProfId = profRows && profRows.length > 0 ? profRows[0].id : undefined;

          await supabase.from('public_profile').upsert({
            ...(existingProfId ? { id: existingProfId } : {}),
            full_name: updatedData.profile.fullName,
            title: updatedData.profile.title,
            subtitle: updatedData.profile.subtitle,
            bio: updatedData.profile.bio,
            avatar_url: updatedData.profile.avatarUrl,
            email: updatedData.profile.email,
            location: updatedData.profile.location,
            cv_url: updatedData.profile.cvUrl,
            updated_at: new Date().toISOString(),
          });

          const { data: seoRows } = await supabase.from('seo_settings').select('id').limit(1);
          const existingSeoId = seoRows && seoRows.length > 0 ? seoRows[0].id : undefined;

          await supabase.from('seo_settings').upsert({
            ...(existingSeoId ? { id: existingSeoId } : {}),
            meta_title: updatedData.seoSettings.metaTitle,
            meta_description: updatedData.seoSettings.metaDescription,
            keywords: updatedData.seoSettings.keywords,
            og_image_url: updatedData.seoSettings.ogImageUrl,
            canonical_url: updatedData.seoSettings.canonicalUrl,
            author_name: updatedData.seoSettings.authorName,
            updated_at: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('Supabase upsert warning:', e);
        }
      }
    }

    return NextResponse.json({ success: true, data: readTmpStore() }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
