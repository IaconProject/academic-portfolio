import { NextResponse } from 'next/server';
import { initialPortfolioData } from '@/lib/initial-data';
import { PortfolioData } from '@/lib/types';
import {
  serverSupabase as supabase,
  isServerSupabaseConfigured as isSupabaseConfigured,
  hasSupabaseServiceRole,
} from '@/lib/supabase/server';
import { validateAdminSession } from '@/lib/auth-helpers';
import { revalidateSeoRoutes } from '@/lib/admin-api';
import { omitAdminCredentials } from '@/lib/admin-credentials-safety';
import fs from 'fs';
import path from 'path';
import { normalizeTabBarSettings } from '@/lib/tab-bar';

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

/**
 * Remove sensitive password field before sending portfolio data over public API.
 */
function sanitizePublicData(data: PortfolioData): PortfolioData {
  return {
    ...data,
    tabBarSettings: normalizeTabBarSettings(data.tabBarSettings),
    adminCredentials: {
      email: data.adminCredentials?.email || 'bilgi@muhammedakan.com',
      password: '', // Never leak password in public GET requests
    },
  };
}

export async function GET(request: Request) {
  if (!validateAdminSession(request)) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Yetkisiz erişim.' } },
      { status: 401 }
    );
  }
  const currentTmp = readTmpStore();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: profileRows } = await supabase
        .from('public_profile')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);

      const profileData = profileRows && profileRows.length > 0 ? profileRows[0] : null;
      const { data: credRows } = await supabase.from('admin_credentials').select('email').limit(1);
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
            updatedAt: profileData.updated_at || undefined,
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
            slug: p.slug,
            locale: p.locale || 'tr',
            translationGroupId: p.translation_group_id,
            excerpt: p.excerpt,
            content: p.content,
            coverImageUrl: p.cover_image_url,
            coverImageAlt: p.cover_image_alt,
            detailStatus: p.detail_status || 'none',
            isFeatured: p.is_featured ?? false,
            sortOrder: p.sort_order ?? 0,
            publishedAt: p.published_at,
            updatedAt: p.updated_at || p.created_at,
          })) : currentTmp.publications,
          projects: (projData && projData.length > 0) ? projData.map((pr: any) => ({
            id: pr.id,
            title: pr.title,
            description: pr.description,
            years: pr.years,
            tags: pr.tags || [],
            url: pr.url,
            slug: pr.slug,
            locale: pr.locale || 'tr',
            translationGroupId: pr.translation_group_id,
            excerpt: pr.excerpt,
            content: pr.content,
            coverImageUrl: pr.cover_image_url,
            coverImageAlt: pr.cover_image_alt,
            relatedPublicationIds: pr.related_publication_ids || [],
            detailStatus: pr.detail_status || 'none',
            isFeatured: pr.is_featured ?? false,
            sortOrder: pr.sort_order ?? 0,
            publishedAt: pr.published_at,
            updatedAt: pr.updated_at || pr.created_at,
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
          tabBarSettings: normalizeTabBarSettings(
            seoData?.tab_bar_settings ?? currentTmp.tabBarSettings
          ),
          adminCredentials: credData ? {
            email: credData.email,
            password: '',
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

    const receivedBody = await request.json();
    // Credentials may only be changed through the dedicated authenticated routes.
    const body = omitAdminCredentials(receivedBody);
    const currentTmp = readTmpStore();

    // 1. Public tab bar and theme settings sync. The payload is normalized on
    // the server so arbitrary action IDs or CSS palette values cannot enter CMS.
    if (Object.prototype.hasOwnProperty.call(body, 'tabBarSettings')) {
      const tabBarSettings = normalizeTabBarSettings(body.tabBarSettings);
      const currentTabBarSettings = normalizeTabBarSettings(currentTmp.tabBarSettings);
      const settingsChanged =
        JSON.stringify(tabBarSettings) !== JSON.stringify(currentTabBarSettings);
      const isTabBarOnlyRequest = Object.keys(body).every(
        (key) => key === 'tabBarSettings'
      );

      body.tabBarSettings = tabBarSettings;

      // Other CMS editors submit the full portfolio object. Do not make their
      // unrelated saves depend on a tab bar write when it is unchanged.
      if (settingsChanged || isTabBarOnlyRequest) {
        if (!isSupabaseConfigured || !supabase || !hasSupabaseServiceRole) {
          return NextResponse.json(
            { success: false, error: { code: 'CMS_STORE_UNAVAILABLE', message: 'Kalıcı CMS veritabanı bağlantısı yapılandırılmamış.' } },
            { status: 503 }
          );
        }

        const { data: seoRows, error: lookupError } = await supabase
          .from('seo_settings')
          .select('id')
          .limit(1);

        if (lookupError) {
          console.error('[cms] tab bar settings lookup failed', lookupError);
          return NextResponse.json(
            { success: false, error: { code: 'TAB_BAR_SETTINGS_READ_FAILED', message: 'Hızlı erişim menüsü ayarları veritabanından okunamadı.' } },
            { status: 503 }
          );
        }

        const existingId = seoRows?.[0]?.id;
        const legacySeo = body.seoSettings || currentTmp.seoSettings || initialPortfolioData.seoSettings;
        const updatedAt = new Date().toISOString();
        const writeResult = existingId
          ? await supabase
              .from('seo_settings')
              .update({
                tab_bar_settings: tabBarSettings,
                updated_at: updatedAt,
              })
              .eq('id', existingId)
              .select('id')
              .single()
          : await supabase
              .from('seo_settings')
              .insert({
                meta_title: legacySeo.metaTitle,
                meta_description: legacySeo.metaDescription,
                keywords: legacySeo.keywords,
                og_image_url: legacySeo.ogImageUrl,
                canonical_url: legacySeo.canonicalUrl,
                author_name: legacySeo.authorName,
                tab_bar_settings: tabBarSettings,
                updated_at: updatedAt,
              })
              .select('id')
              .single();

        if (writeResult.error) {
          console.error('[cms] tab bar settings write failed', writeResult.error);
          return NextResponse.json(
            { success: false, error: { code: 'TAB_BAR_SETTINGS_WRITE_FAILED', message: 'Hızlı erişim menüsü ayarları kalıcı olarak kaydedilemedi.' } },
            { status: 503 }
          );
        }
      }

      writeTmpStore({ ...currentTmp, tabBarSettings });
    }

    // 2. Notification Settings Sync
    if (body.notificationSettings) {
      const notif = body.notificationSettings;
      if (!isSupabaseConfigured || !supabase || !hasSupabaseServiceRole) {
        return NextResponse.json(
          { success: false, error: { code: 'CMS_STORE_UNAVAILABLE', message: 'Kalıcı CMS veritabanı bağlantısı yapılandırılmamış.' } },
          { status: 503 }
        );
      }

      const { data: notifRows, error: lookupError } = await supabase
        .from('notification_settings')
        .select('id')
        .limit(1);
      if (lookupError) {
        console.error('[cms] notification settings lookup failed', lookupError);
        return NextResponse.json(
          { success: false, error: { code: 'NOTIFICATION_SETTINGS_READ_FAILED', message: 'Bildirim ayarları veritabanından okunamadı.' } },
          { status: 503 }
        );
      }
      const existingId = notifRows?.[0]?.id;
      const { error: upsertError } = await supabase.from('notification_settings').upsert({
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
      if (upsertError) {
        console.error('[cms] notification settings upsert failed', upsertError);
        return NextResponse.json(
          { success: false, error: { code: 'NOTIFICATION_SETTINGS_WRITE_FAILED', message: 'Bildirim ayarları kalıcı olarak kaydedilemedi.' } },
          { status: 503 }
        );
      }

      const updatedFull = { ...currentTmp, notificationSettings: notif };
      writeTmpStore(sanitizePublicData(updatedFull));
    }

    // 3. Full Portfolio Data Sync
    if (body.profile) {
      const updatedData: PortfolioData = {
        ...currentTmp,
        ...body,
      };
      writeTmpStore(sanitizePublicData(updatedData));

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

    revalidateSeoRoutes();
    return NextResponse.json({ success: true, data: sanitizePublicData(readTmpStore()) }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
