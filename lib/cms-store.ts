import { PortfolioData, AdminCredentials } from './types';
import { initialPortfolioData } from './initial-data';
import { supabase, isSupabaseConfigured } from './supabase/client';

const STORAGE_KEY = 'academic_portfolio_cms_v1';
const CREDS_KEY = 'academic_portfolio_admin_creds_v1';

export const defaultAdminCredentials: AdminCredentials = {
  email: 'admin@muhammedakan.com',
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
      const parsed = JSON.parse(cached);
      if (parsed && parsed.profile) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read from localStorage:', e);
  }

  return initialPortfolioData;
}

export function savePortfolioDataLocally(data: PortfolioData): void {
  if (typeof window === 'undefined') return;
  try {
    // Preserve custom avatar if current data provided has initial default avatar
    const existing = getPortfolioData();
    if (
      existing?.profile?.avatarUrl &&
      existing.profile.avatarUrl !== initialPortfolioData.profile.avatarUrl &&
      data?.profile?.avatarUrl === initialPortfolioData.profile.avatarUrl
    ) {
      data.profile.avatarUrl = existing.profile.avatarUrl;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export async function fetchPortfolioFromSupabase(): Promise<PortfolioData | null> {
  const localData = getPortfolioData();
  const localCreds = getAdminCredentials();

  // First try fetching from /api/cms endpoint
  try {
    const res = await fetch('/api/cms?t=' + Date.now(), {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (res.ok) {
      const apiData: PortfolioData = await res.json();

      if (apiData && apiData.profile) {
        // Sync Admin Credentials if returned by server
        if (apiData.adminCredentials && apiData.adminCredentials.email) {
          saveAdminCredentials(apiData.adminCredentials);
        }

        // Check if server returned default initial data while client has local custom edits
        const isServerInitial = apiData.profile.fullName === initialPortfolioData.profile.fullName &&
          apiData.profile.bio === initialPortfolioData.profile.bio;

        const isClientCustom = localData.profile.fullName !== initialPortfolioData.profile.fullName ||
          localData.profile.bio !== initialPortfolioData.profile.bio ||
          (localData.profile.avatarUrl && localData.profile.avatarUrl !== initialPortfolioData.profile.avatarUrl);

        if (isServerInitial && isClientCustom) {
          // Re-hydrate server with client's custom data so deploy never wipes client edits
          fetch('/api/cms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...localData, adminCredentials: localCreds }),
          }).catch(() => {});
          
          return localData;
        }

        // If server returns initial avatar default but local has a custom uploaded avatar, preserve custom local avatar
        if (
          localData?.profile?.avatarUrl &&
          localData.profile.avatarUrl !== initialPortfolioData.profile.avatarUrl &&
          apiData.profile.avatarUrl === initialPortfolioData.profile.avatarUrl
        ) {
          apiData.profile.avatarUrl = localData.profile.avatarUrl;
        }

        savePortfolioDataLocally(apiData);
        return apiData;
      }
    }
  } catch (e) {
    console.warn('API cms fetch warning:', e);
  }

  if (!isSupabaseConfigured || !supabase) {
    return getPortfolioData();
  }

  try {
    const { data: profileRows } = await supabase
      .from('public_profile')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);

    const profileData = profileRows && profileRows.length > 0 ? profileRows[0] : null;

    if (!profileData) {
      return getPortfolioData();
    }

    const { data: eduData } = await supabase.from('education').select('*').order('created_at', { ascending: true });
    const { data: pubData } = await supabase.from('publications').select('*').order('created_at', { ascending: true });
    const { data: projData } = await supabase.from('projects').select('*').order('created_at', { ascending: true });
    const { data: confData } = await supabase.from('conferences').select('*').order('created_at', { ascending: true });
    const { data: actData } = await supabase.from('activities').select('*').order('created_at', { ascending: true });
    const { data: refData } = await supabase.from('references_list').select('*').order('created_at', { ascending: true });
    const { data: socData } = await supabase.from('social_links').select('*').order('created_at', { ascending: true });
    const { data: seoRows } = await supabase.from('seo_settings').select('*').limit(1);
    const { data: credRows } = await supabase.from('admin_credentials').select('*').limit(1);

    const seoData = seoRows && seoRows.length > 0 ? seoRows[0] : null;
    const credData = credRows && credRows.length > 0 ? credRows[0] : null;

    if (credData) {
      saveAdminCredentials({ email: credData.email, password: credData.password });
    }

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
      education: (eduData && eduData.length > 0) ? eduData.map((item: any) => ({
        id: item.id,
        degree: item.degree,
        institution: item.institution,
        years: item.years,
        status: item.status || 'Tamamlandı',
        description: item.description,
        isCurrent: item.is_current || false,
      })) : initialPortfolioData.education,
      publications: (pubData && pubData.length > 0) ? pubData.map((item: any) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        publisher: item.publisher,
        year: item.year,
        url: item.url,
        doi: item.doi,
      })) : initialPortfolioData.publications,
      projects: (projData && projData.length > 0) ? projData.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        years: item.years,
        tags: item.tags || [],
        url: item.url,
      })) : initialPortfolioData.projects,
      conferences: (confData && confData.length > 0) ? confData.map((item: any) => ({
        id: item.id,
        title: item.title,
        eventName: item.event_name,
        location: item.location,
        year: item.year,
        role: item.role,
      })) : initialPortfolioData.conferences,
      activities: (actData && actData.length > 0) ? actData.map((item: any) => ({
        id: item.id,
        title: item.title,
        organization: item.organization,
        years: item.years,
        description: item.description,
      })) : initialPortfolioData.activities,
      references: (refData && refData.length > 0) ? refData.map((item: any) => ({
        id: item.id,
        name: item.name,
        title: item.title,
        institution: item.institution,
        email: item.email,
        phone: item.phone,
        isFeatured: item.is_featured ?? true,
      })) : initialPortfolioData.references,
      socialLinks: (socData && socData.length > 0) ? socData.map((item: any) => ({
        id: item.id,
        platform: item.platform,
        url: item.url,
        iconName: item.icon_name,
      })) : initialPortfolioData.socialLinks,
      seoSettings: seoData ? {
        metaTitle: seoData.meta_title,
        metaDescription: seoData.meta_description,
        keywords: seoData.keywords,
        ogImageUrl: seoData.og_image_url,
        canonicalUrl: seoData.canonical_url,
        authorName: seoData.author_name,
      } : initialPortfolioData.seoSettings,
      adminCredentials: credData ? {
        email: credData.email,
        password: credData.password,
      } : localCreds,
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
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, cacheControl: '0' });

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
