import { PortfolioData } from './types';
import { initialPortfolioData } from './initial-data';
import { supabase, isSupabaseConfigured } from './supabase/client';
import fs from 'fs';
import path from 'path';

const TMP_FILE_PATH = path.join('/tmp', 'academic_portfolio_data_v2.json');

export async function getPortfolioDataServer(): Promise<PortfolioData> {
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

        return {
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
          })) : initialPortfolioData.education,
          publications: (pubData && pubData.length > 0) ? pubData.map((p: any) => ({
            id: p.id,
            type: p.type,
            title: p.title,
            publisher: p.publisher,
            year: p.year,
            url: p.url,
            doi: p.doi,
          })) : initialPortfolioData.publications,
          projects: (projData && projData.length > 0) ? projData.map((pr: any) => ({
            id: pr.id,
            title: pr.title,
            description: pr.description,
            years: pr.years,
            tags: pr.tags || [],
            url: pr.url,
          })) : initialPortfolioData.projects,
          conferences: (confData && confData.length > 0) ? confData.map((c: any) => ({
            id: c.id,
            title: c.title,
            eventName: c.event_name,
            location: c.location,
            year: c.year,
            role: c.role,
          })) : initialPortfolioData.conferences,
          activities: (actData && actData.length > 0) ? actData.map((a: any) => ({
            id: a.id,
            title: a.title,
            organization: a.organization,
            years: a.years,
            description: a.description,
          })) : initialPortfolioData.activities,
          references: (refData && refData.length > 0) ? refData.map((r: any) => ({
            id: r.id,
            name: r.name,
            title: r.title,
            institution: r.institution,
            email: r.email,
            phone: r.phone,
            isFeatured: r.is_featured ?? true,
          })) : initialPortfolioData.references,
          socialLinks: (socData && socData.length > 0) ? socData.map((s: any) => ({
            id: s.id,
            platform: s.platform,
            url: s.url,
            iconName: s.icon_name || s.platform,
          })) : initialPortfolioData.socialLinks,
          seoSettings: seoData ? {
            metaTitle: seoData.meta_title,
            metaDescription: seoData.meta_description,
            keywords: seoData.keywords,
            ogImageUrl: seoData.og_image_url,
            canonicalUrl: seoData.canonical_url,
            authorName: seoData.author_name,
          } : initialPortfolioData.seoSettings,
        };
      }
    } catch (e) {
      console.warn('Server Supabase fetch warning:', e);
    }
  }

  try {
    if (fs.existsSync(TMP_FILE_PATH)) {
      const content = fs.readFileSync(TMP_FILE_PATH, 'utf-8');
      if (content) {
        return JSON.parse(content);
      }
    }
  } catch (e) {}

  return initialPortfolioData;
}
