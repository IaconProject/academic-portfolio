import { NextResponse } from 'next/server';
import { initialPortfolioData } from '@/lib/initial-data';
import { PortfolioData, AdminCredentials } from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { validateAdminSession } from '@/lib/auth-helpers';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TMP_FILE_PATH = path.join('/tmp', 'academic_portfolio_data_v2.json');
const INITIAL_DATA_FILE = path.join(process.cwd(), 'lib', 'initial-data.ts');

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
  try {
    if (fs.existsSync(INITIAL_DATA_FILE)) {
      const content = `import { PortfolioData } from './types';\n\nexport const initialPortfolioData: PortfolioData = ${JSON.stringify(data, null, 2)};\n`;
      fs.writeFileSync(INITIAL_DATA_FILE, content, 'utf-8');
    }
  } catch (e) {
    // Ephemeral disk in lambda
  }
}

/**
 * Remove sensitive password field before sending portfolio data over public API.
 */
function sanitizePublicData(data: PortfolioData): PortfolioData {
  return {
    ...data,
    adminCredentials: {
      email: data.adminCredentials?.email || 'bilgi@muhammedakan.com',
      password: '', // Never leak password in public GET requests
    },
  };
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
      const { data: credRows } = await supabase.from('admin_credentials').select('*').limit(1);
      const credData = credRows && credRows.length > 0 ? credRows[0] : null;
      const { data: notifRows } = await supabase.from('notification_settings').select('*').limit(1);
      const notifData = notifRows && notifRows.length > 0 ? notifRows[0] : null;

      if (profileData || credData) {
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
          profile: profileData ? {
            fullName: profileData.full_name,
            title: profileData.title,
            subtitle: profileData.subtitle || '',
            bio: profileData.bio,
            avatarUrl: profileData.avatar_url,
            email: profileData.email,
            location: profileData.location || '',
            cvUrl: profileData.cv_url || '#',
          } : currentTmp.profile,
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
            doi: p.doi,
          })) : currentTmp.publications,
          projects: (projData && projData.length > 0) ? projData.map((pr: any) => ({
            id: pr.id,
            title: pr.title,
            description: pr.description,
            years: pr.years,
            tags: pr.tags || [],
            url: pr.url,
          })) : currentTmp.projects,
          conferences: (confData && confData.length > 0) ? confData.map((c: any) => ({
            id: c.id,
            title: c.title,
            eventName: c.event_name,
            location: c.location,
            year: c.year,
            role: c.role,
          })) : currentTmp.conferences,
          activities: (actData && actData.length > 0) ? actData.map((a: any) => ({
            id: a.id,
            title: a.title,
            organization: a.organization,
            years: a.years,
            description: a.description,
          })) : currentTmp.activities,
          references: (refData && refData.length > 0) ? refData.map((r: any) => ({
            id: r.id,
            name: r.name,
            title: r.title,
            institution: r.institution,
            email: r.email,
            phone: r.phone,
            isFeatured: r.is_featured ?? true,
          })) : currentTmp.references,
          socialLinks: (socData && socData.length > 0) ? socData.map((s: any) => ({
            id: s.id,
            platform: s.platform,
            url: s.url,
            iconName: s.icon_name || s.platform,
          })) : currentTmp.socialLinks,
          seoSettings: seoData ? {
            metaTitle: seoData.meta_title,
            metaDescription: seoData.meta_description,
            keywords: seoData.keywords,
            ogImageUrl: seoData.og_image_url,
            canonicalUrl: seoData.canonical_url,
            authorName: seoData.author_name,
          } : currentTmp.seoSettings,
          adminCredentials: credData ? {
            email: credData.email,
            password: credData.password,
          } : currentTmp.adminCredentials,
          notificationSettings: notifData ? {
            emailNotificationsEnabled: notifData.email_notifications_enabled ?? true,
            notifyOnNewMessage: notifData.notify_on_new_message ?? true,
            notifyOnNewVisitor: notifData.notify_on_new_visitor ?? false,
            recipientEmail: notifData.recipient_email || 'bilgi@muhammedakan.com',
            recipientEmails: notifData.recipient_emails || ['bilgi@muhammedakan.com'],
            resendApiKey: notifData.resend_api_key || '',
            senderEmail: notifData.sender_email || 'noreply@muhammedakan.com',
          } : currentTmp.notificationSettings,
        };

        writeTmpStore(fetchedData);
        return NextResponse.json(sanitizePublicData(fetchedData), {
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
        });
      }
    } catch (e) {
      console.warn('Supabase fetch error, returning tmp store:', e);
    }
  }

  return NextResponse.json(sanitizePublicData(currentTmp), {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
  });
}

export async function POST(request: Request) {
  try {
    // Session authorization check for administrative writes
    const isAuth = validateAdminSession(request);
    if (!isAuth) {
      return NextResponse.json({ success: false, error: 'Yetkisiz erişim. Lütfen giriş yapın.' }, { status: 401 });
    }

    const body = await request.json();
    const currentTmp = readTmpStore();

    // 1. Admin Credentials Upsert
    if (body.adminCredentials) {
      const creds: AdminCredentials = body.adminCredentials;
      const updatedFull = { ...currentTmp, adminCredentials: creds };
      writeTmpStore(updatedFull);

      if (isSupabaseConfigured && supabase) {
        try {
          const { data: credRows } = await supabase.from('admin_credentials').select('id').limit(1);
          const existingId = credRows && credRows.length > 0 ? credRows[0].id : undefined;

          await supabase.from('admin_credentials').upsert({
            ...(existingId ? { id: existingId } : {}),
            email: creds.email,
            password: creds.password,
            updated_at: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('Supabase admin_credentials upsert error:', e);
        }
      }
    }

    // 2. Notification Settings Sync
    if (body.notificationSettings) {
      const notif = body.notificationSettings;
      const updatedFull = { ...currentTmp, notificationSettings: notif };
      writeTmpStore(updatedFull);

      if (isSupabaseConfigured && supabase) {
        try {
          const { data: notifRows } = await supabase.from('notification_settings').select('id').limit(1);
          const existingId = notifRows && notifRows.length > 0 ? notifRows[0].id : undefined;

          await supabase.from('notification_settings').upsert({
            ...(existingId ? { id: existingId } : {}),
            email_notifications_enabled: notif.emailNotificationsEnabled ?? true,
            notify_on_new_message: notif.notifyOnNewMessage ?? true,
            notify_on_new_visitor: notif.notifyOnNewVisitor ?? false,
            recipient_email: notif.recipientEmail || 'bilgi@muhammedakan.com',
            recipient_emails: notif.recipientEmails || [notif.recipientEmail || 'bilgi@muhammedakan.com'],
            resend_api_key: notif.resendApiKey || '',
            sender_email: notif.senderEmail || 'noreply@muhammedakan.com',
            updated_at: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('Supabase notification_settings upsert error:', e);
        }
      }
    }

    // 3. Full Portfolio Data Sync
    if (body.profile) {
      const updatedData: PortfolioData = {
        ...currentTmp,
        ...body,
      };
      writeTmpStore(updatedData);

      if (isSupabaseConfigured && supabase) {
        try {
          // Profile Upsert
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

          // SEO Upsert
          if (updatedData.seoSettings) {
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
          }

          // Education Sync
          if (Array.isArray(updatedData.education)) {
            await supabase.from('education').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (updatedData.education.length > 0) {
              await supabase.from('education').insert(
                updatedData.education.map((e) => ({
                  degree: e.degree,
                  institution: e.institution,
                  years: e.years,
                  status: e.status || 'Tamamlandı',
                  description: e.description || '',
                  is_current: e.isCurrent || false,
                }))
              );
            }
          }

          // Publications Sync
          if (Array.isArray(updatedData.publications)) {
            await supabase.from('publications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (updatedData.publications.length > 0) {
              await supabase.from('publications').insert(
                updatedData.publications.map((p) => ({
                  type: p.type,
                  title: p.title,
                  publisher: p.publisher || '',
                  year: p.year,
                  url: p.url || '#',
                  doi: p.doi || '',
                }))
              );
            }
          }

          // Projects Sync
          if (Array.isArray(updatedData.projects)) {
            await supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (updatedData.projects.length > 0) {
              await supabase.from('projects').insert(
                updatedData.projects.map((pr) => ({
                  title: pr.title,
                  description: pr.description,
                  years: pr.years,
                  tags: pr.tags || [],
                  url: pr.url || '#',
                }))
              );
            }
          }

          // Conferences Sync
          if (Array.isArray(updatedData.conferences)) {
            await supabase.from('conferences').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (updatedData.conferences.length > 0) {
              await supabase.from('conferences').insert(
                updatedData.conferences.map((c) => ({
                  title: c.title,
                  event_name: c.eventName,
                  location: c.location,
                  year: c.year,
                  role: c.role,
                }))
              );
            }
          }

          // Activities Sync
          if (Array.isArray(updatedData.activities)) {
            await supabase.from('activities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (updatedData.activities.length > 0) {
              await supabase.from('activities').insert(
                updatedData.activities.map((a) => ({
                  title: a.title,
                  organization: a.organization,
                  years: a.years,
                  description: a.description || '',
                }))
              );
            }
          }

          // References Sync
          if (Array.isArray(updatedData.references)) {
            await supabase.from('references_list').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (updatedData.references.length > 0) {
              await supabase.from('references_list').insert(
                updatedData.references.map((r) => ({
                  name: r.name,
                  title: r.title,
                  institution: r.institution,
                  email: r.email || '',
                  phone: r.phone || '',
                  is_featured: r.isFeatured ?? true,
                }))
              );
            }
          }

          // Social Links Sync
          if (Array.isArray(updatedData.socialLinks)) {
            await supabase.from('social_links').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (updatedData.socialLinks.length > 0) {
              await supabase.from('social_links').insert(
                updatedData.socialLinks.map((s) => ({
                  platform: s.platform,
                  url: s.url,
                  icon_name: s.iconName || s.platform,
                }))
              );
            }
          }
        } catch (e) {
          console.warn('Supabase upsert warning:', e);
        }
      }
    }

    return NextResponse.json({ success: true, data: sanitizePublicData(readTmpStore()) }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
