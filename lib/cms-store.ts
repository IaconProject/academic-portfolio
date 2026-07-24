import { PortfolioData, AdminCredentials } from './types';
import { initialPortfolioData } from './initial-data';
import { supabase, isSupabaseConfigured } from './supabase/client';

const STORAGE_KEY = 'academic_portfolio_cms_v1';
const CREDS_KEY = 'academic_portfolio_admin_creds_v1';

export const defaultAdminCredentials: AdminCredentials = {
  email: 'admin@cedkan.com',
  password: 'admin',
};

export function getAdminCredentials(): AdminCredentials {
  if (typeof window === 'undefined') return defaultAdminCredentials;
  try {
    const cached = localStorage.getItem(CREDS_KEY);
    if (cached) return JSON.parse(cached);
  } catch (e) {
    console.error('Failed to read admin credentials:', e);
  }
  return defaultAdminCredentials;
}

export function saveAdminCredentials(creds: AdminCredentials): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
  } catch (e) {
    console.error('Failed to save admin credentials:', e);
  }
}

export function getPortfolioData(): PortfolioData {
  if (typeof window === 'undefined') {
    return initialPortfolioData;
  }

  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error('Failed to read from localStorage:', e);
  }

  return initialPortfolioData;
}

export function savePortfolioDataLocally(data: PortfolioData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export async function fetchPortfolioFromSupabase(): Promise<PortfolioData | null> {
  if (!isSupabaseConfigured || !supabase) {
    return getPortfolioData();
  }

  try {
    const { data: profileData } = await supabase.from('public_profile').select('*').single();
    const { data: eduData } = await supabase.from('education').select('*').order('created_at', { ascending: true });
    const { data: pubData } = await supabase.from('publications').select('*').order('created_at', { ascending: true });
    const { data: projData } = await supabase.from('projects').select('*').order('created_at', { ascending: true });
    const { data: confData } = await supabase.from('conferences').select('*').order('created_at', { ascending: true });
    const { data: actData } = await supabase.from('activities').select('*').order('created_at', { ascending: true });
    const { data: refData } = await supabase.from('references_list').select('*').order('created_at', { ascending: true });
    const { data: socData } = await supabase.from('social_links').select('*').order('created_at', { ascending: true });
    const { data: seoData } = await supabase.from('seo_settings').select('*').single();
    const { data: credsData } = await supabase.from('admin_credentials').select('*').single();

    if (credsData) {
      saveAdminCredentials({
        email: credsData.email,
        password: credsData.password,
      });
    }

    if (!profileData) return getPortfolioData();

    const result: PortfolioData = {
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
      education: (eduData || []).map((item: any) => ({
        id: item.id,
        degree: item.degree,
        institution: item.institution,
        years: item.years,
        status: item.status || 'Tamamlandı',
        description: item.description,
        isCurrent: item.is_current || false,
      })),
      publications: (pubData || []).map((item: any) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        publisher: item.publisher,
        year: item.year,
        url: item.url,
        doi: item.doi,
      })),
      projects: (projData || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        years: item.years,
        tags: item.tags || [],
        url: item.url,
      })),
      conferences: (confData || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        eventName: item.event_name,
        location: item.location,
        year: item.year,
        role: item.role,
      })),
      activities: (actData || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        organization: item.organization,
        years: item.years,
        description: item.description,
      })),
      references: (refData || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        title: item.title,
        institution: item.institution,
        email: item.email,
        phone: item.phone,
        isFeatured: item.is_featured ?? true,
      })),
      socialLinks: (socData || []).map((item: any) => ({
        id: item.id,
        platform: item.platform,
        url: item.url,
        iconName: item.icon_name,
      })),
      seoSettings: seoData ? {
        metaTitle: seoData.meta_title,
        metaDescription: seoData.meta_description,
        keywords: seoData.keywords,
        ogImageUrl: seoData.og_image_url,
        canonicalUrl: seoData.canonical_url,
        authorName: seoData.author_name,
      } : initialPortfolioData.seoSettings,
    };

    savePortfolioDataLocally(result);
    return result;
  } catch (err) {
    console.error('Error fetching from Supabase, falling back to local cache:', err);
    return getPortfolioData();
  }
}

export async function uploadAvatarImage(file: File): Promise<string> {
  if (isSupabaseConfigured && supabase) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        if (urlData?.publicUrl) {
          return urlData.publicUrl;
        }
      }
    } catch (e) {
      console.error('Failed to upload to Supabase storage:', e);
    }
  }

  // Fallback to Base64 data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
