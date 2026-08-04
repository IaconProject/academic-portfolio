'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  Code2,
  ExternalLink,
  FileSearch,
  Globe,
  History,
  Image as ImageIcon,
  KeyRound,
  Link2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Share2,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  SeoAuditResult,
  SeoPage,
  SeoRedirect,
  SeoRevision,
  SeoSettings,
} from '@/lib/types';
import { DEFAULT_SEO_PAGES } from '@/lib/seo';

interface SeoEditorProps {
  seoSettings: SeoSettings;
  seoPages?: SeoPage[];
  seoRedirects?: SeoRedirect[];
  profileName?: string;
  onSave: (updatedSeo: SeoSettings) => void;
}

type Tab =
  | 'overview'
  | 'settings'
  | 'pages'
  | 'social'
  | 'schema'
  | 'indexing'
  | 'keywords'
  | 'integrations'
  | 'history';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.muhammedakan.com';

const TAB_ITEMS: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
  { id: 'overview', label: 'Genel Bakış', icon: Activity },
  { id: 'settings', label: 'Site Ayarları', icon: Settings2 },
  { id: 'pages', label: 'Sayfalar', icon: FileSearch },
  { id: 'social', label: 'Sosyal Kartlar', icon: Share2 },
  { id: 'schema', label: 'Yapılandırılmış Veri', icon: Code2 },
  { id: 'indexing', label: 'İndeksleme', icon: Link2 },
  { id: 'keywords', label: 'Anahtar Kelimeler', icon: Search },
  { id: 'integrations', label: 'GSC & GA4', icon: BarChart3 },
  { id: 'history', label: 'Geçmiş', icon: History },
];

function withDefaults(settings: SeoSettings): Required<SeoSettings> {
  return {
    ...settings,
    metaTitle: settings.metaTitle || '',
    metaDescription: settings.metaDescription || '',
    keywords: settings.keywords || '',
    ogImageUrl: settings.ogImageUrl || `${SITE_URL}/og.png`,
    canonicalUrl: SITE_URL,
    authorName: settings.authorName || '',
    siteName: settings.siteName || 'Muhammed Akan Akademik Portfolyo',
    titleTemplate: settings.titleTemplate || '%s | Muhammed Akan',
    defaultLocale: settings.defaultLocale || 'tr',
    twitterHandle: settings.twitterHandle || '',
    googleSiteVerification: settings.googleSiteVerification || '',
    bingSiteVerification: settings.bingSiteVerification || '',
    ga4MeasurementId: settings.ga4MeasurementId || '',
    gscProperty: settings.gscProperty || '',
    ga4PropertyId: settings.ga4PropertyId || '',
    enableAnalytics: settings.enableAnalytics ?? false,
    allowIndexing: settings.allowIndexing ?? true,
    alternateName: settings.alternateName || '',
    orcidUrl: settings.orcidUrl || '',
    scholarUrl: settings.scholarUrl || '',
  };
}

export const SeoEditor: React.FC<SeoEditorProps> = ({
  seoSettings,
  seoPages = DEFAULT_SEO_PAGES,
  seoRedirects = [],
  profileName = 'Muhammed Akan',
  onSave,
}) => {
  const [tab, setTab] = useState<Tab>('overview');
  const [settings, setSettings] = useState(withDefaults(seoSettings));
  const [pages, setPages] = useState<SeoPage[]>(seoPages.length ? seoPages : DEFAULT_SEO_PAGES);
  const [selectedRouteKey, setSelectedRouteKey] = useState('home');
  const [redirects, setRedirects] = useState<SeoRedirect[]>(seoRedirects);
  const [audit, setAudit] = useState<SeoAuditResult | null>(null);
  const [insights, setInsights] = useState<any>(null);
  const [revisions, setRevisions] = useState<SeoRevision[]>([]);
  const [busy, setBusy] = useState('');
  const [redirectDraft, setRedirectDraft] = useState({
    fromPath: '',
    toPath: '',
    reason: '',
  });

  const token =
    typeof window !== 'undefined'
      ? sessionStorage.getItem('admin_token') || ''
      : '';
  const api = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'X-Admin-Token': token } : {}),
          ...(options.headers || {}),
        },
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(
          payload?.error?.message || payload?.error || 'İşlem tamamlanamadı.'
        );
      }
      return payload.data;
    },
    [token]
  );

  const loadAudit = useCallback(async () => {
    try {
      setAudit(await api('/api/admin/seo/audit'));
    } catch {
      // Migration uygulanmadan önce yerel özet gösterilir.
    }
  }, [api]);

  useEffect(() => {
    Promise.all([
      api('/api/admin/seo/settings'),
      api('/api/admin/seo/pages'),
      api('/api/admin/seo/redirects'),
      api('/api/admin/seo/audit'),
    ])
      .then(([savedSettings, savedPages, savedRedirects, savedAudit]) => {
        setSettings(withDefaults(savedSettings));
        if (Array.isArray(savedPages) && savedPages.length) setPages(savedPages);
        if (Array.isArray(savedRedirects)) setRedirects(savedRedirects);
        setAudit(savedAudit);
      })
      .catch(() => {
        loadAudit();
      });
  }, [api, loadAudit]);

  const selectedPage =
    pages.find((page) => page.routeKey === selectedRouteKey) || pages[0];
  const healthColor =
    (audit?.score || 0) >= 85
      ? 'text-emerald-600'
      : (audit?.score || 0) >= 60
        ? 'text-amber-600'
        : 'text-rose-600';

  const saveSettings = async () => {
    setBusy('settings');
    try {
      const saved = await api('/api/admin/seo/settings', {
        method: 'PATCH',
        body: JSON.stringify(settings),
      });
      setSettings(withDefaults(saved));
      onSave({ ...settings, canonicalUrl: SITE_URL });
      toast.success('Site SEO ayarları kaydedildi.');
      await loadAudit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ayarlar kaydedilemedi.');
    } finally {
      setBusy('');
    }
  };

  const savePage = async () => {
    if (!selectedPage) return;
    setBusy('page');
    try {
      const saved = await api(
        `/api/admin/seo/pages/${encodeURIComponent(selectedPage.routeKey)}`,
        { method: 'PATCH', body: JSON.stringify(selectedPage) }
      );
      setPages((current) =>
        current.map((page) =>
          page.routeKey === selectedPage.routeKey ? { ...page, ...saved } : page
        )
      );
      toast.success('Sayfa SEO ayarları kaydedildi.');
      await loadAudit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Sayfa kaydedilemedi.');
    } finally {
      setBusy('');
    }
  };

  const updateSelectedPage = (patch: Partial<SeoPage>) => {
    setPages((current) =>
      current.map((page) =>
        page.routeKey === selectedRouteKey ? { ...page, ...patch } : page
      )
    );
  };

  const runAudit = async () => {
    setBusy('audit');
    try {
      const result = await api('/api/admin/seo/audit', { method: 'POST' });
      setAudit(result);
      toast.success('SEO denetimi tamamlandı.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Denetim çalıştırılamadı.');
    } finally {
      setBusy('');
    }
  };

  const saveRedirect = async () => {
    setBusy('redirect');
    try {
      const saved = await api('/api/admin/seo/redirects', {
        method: 'POST',
        body: JSON.stringify({
          ...redirectDraft,
          statusCode: 308,
          isActive: true,
        }),
      });
      setRedirects((current) => [saved, ...current]);
      setRedirectDraft({ fromPath: '', toPath: '', reason: '' });
      toast.success('308 redirect oluşturuldu.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Redirect kaydedilemedi.');
    } finally {
      setBusy('');
    }
  };

  const deleteRedirect = async (id: string) => {
    try {
      await api(`/api/admin/seo/redirects?id=${id}`, { method: 'DELETE' });
      setRedirects((current) => current.filter((item) => item.id !== id));
      toast.success('Redirect silindi.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Redirect silinemedi.');
    }
  };

  const toggleRedirect = async (redirect: SeoRedirect) => {
    try {
      const saved = await api('/api/admin/seo/redirects', {
        method: 'PATCH',
        body: JSON.stringify({
          ...redirect,
          isActive: !redirect.isActive,
        }),
      });
      setRedirects((current) =>
        current.map((item) =>
          item.id === redirect.id
            ? { ...item, isActive: !item.isActive, ...saved }
            : item
        )
      );
      toast.success(
        redirect.isActive ? 'Redirect duraklatıldı.' : 'Redirect etkinleştirildi.'
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Redirect güncellenemedi.');
    }
  };

  const loadInsights = async (range = 28) => {
    setBusy('insights');
    try {
      setInsights(await api(`/api/admin/seo/insights?range=${range}`));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Raporlar alınamadı.');
    } finally {
      setBusy('');
    }
  };

  const loadHistory = async () => {
    setBusy('history');
    try {
      setRevisions(await api('/api/admin/seo/revisions'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Geçmiş alınamadı.');
    } finally {
      setBusy('');
    }
  };

  const uploadSocialCard = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy('social-upload');
    try {
      const bitmap = await createImageBitmap(file);
      const { width, height } = bitmap;
      const ratio = width / height;
      bitmap.close();
      if (
        Math.abs(ratio - 1200 / 630) > 0.03 ||
        width < 1200 ||
        height < 630
      ) {
        throw new Error('Sosyal kart en az 1200×630 ve 1.91:1 oranında olmalıdır.');
      }
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: token ? { 'X-Admin-Token': token } : {},
        body: formData,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.url) {
        throw new Error(result?.error || 'Görsel yüklenemedi.');
      }
      setSettings((current) => ({ ...current, ogImageUrl: result.url }));
      toast.success('Sosyal kart yüklendi. Kalıcı olması için ayarları kaydedin.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Görsel yüklenemedi.');
    } finally {
      setBusy('');
      event.target.value = '';
    }
  };

  useEffect(() => {
    if ((tab === 'integrations' || tab === 'keywords') && !insights) loadInsights();
    if (tab === 'history' && !revisions.length) loadHistory();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const schemaPreview = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': `${SITE_URL}/#website`,
          url: SITE_URL,
          name: settings.siteName,
          inLanguage: 'tr-TR',
        },
        {
          '@type': 'ProfilePage',
          mainEntity: { '@id': `${SITE_URL}/#person` },
        },
        {
          '@type': 'Person',
          '@id': `${SITE_URL}/#person`,
          name: settings.authorName || profileName,
          alternateName: settings.alternateName || undefined,
          url: SITE_URL,
          sameAs: [settings.orcidUrl, settings.scholarUrl].filter(Boolean),
        },
      ],
    }),
    [profileName, settings]
  );

  return (
    <div className="min-w-0 space-y-5">
      <header className="admin-panel-card">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Search className="h-5 w-5 text-amber-600" />
              SEO ve Arama Görünürlüğü Merkezi
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              Sayfalar, canonical, sosyal kartlar, schema, redirectler ve arama
              performansı tek merkezden yönetilir.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-stone-100 px-4 py-3 dark:bg-stone-800">
            <span className={`text-3xl font-black ${healthColor}`}>
              {audit?.score ?? '—'}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              SEO Sağlık
              <br />
              Puanı
            </span>
          </div>
        </div>
      </header>

      <nav className="admin-tabs flex max-w-full gap-1.5 overflow-x-auto rounded-2xl border border-stone-200 bg-white/80 p-1.5 dark:border-stone-800 dark:bg-stone-900/80">
        {TAB_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ${
                tab === item.id
                  ? 'bg-stone-900 text-white dark:bg-amber-600 dark:text-stone-950'
                  : 'text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <section className="rounded-2xl border border-stone-200/80 bg-white/90 p-6 shadow-md dark:border-stone-800 dark:bg-stone-900/90 md:p-8">
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Teknik ve editoryal sağlık</h3>
                <p className="text-xs text-stone-500">
                  Son kontrol: {audit?.checkedAt ? new Date(audit.checkedAt).toLocaleString('tr-TR') : 'Henüz yok'}
                </p>
              </div>
              <button onClick={runAudit} className="seo-primary-button" disabled={busy === 'audit'}>
                <RefreshCw className={`h-4 w-4 ${busy === 'audit' ? 'animate-spin' : ''}`} />
                Denetimi çalıştır
              </button>
            </div>
            {audit?.categoryScores && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  ['indexing', 'Canonical / indeks', 40],
                  ['metadata', 'Metadata', 20],
                  ['content', 'İçerik', 20],
                  ['schema', 'Schema', 10],
                  ['performance', 'Performans', 10],
                ].map(([key, label, maximum]) => (
                  <div key={String(key)} className="rounded-xl bg-stone-100 p-4 dark:bg-stone-800">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">{label}</p>
                    <p className="mt-2 text-xl font-black">{audit.categoryScores?.[key as keyof typeof audit.categoryScores]}<span className="text-xs font-semibold text-stone-400">/{maximum}</span></p>
                  </div>
                ))}
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              {(audit?.issues || []).map((issue) => (
                <div
                  key={issue.code}
                  className={`rounded-xl border p-4 ${
                    issue.severity === 'critical'
                      ? 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30'
                      : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'
                  }`}
                >
                  <div className="flex gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-sm font-bold">{issue.title}</p>
                      <p className="mt-1 text-xs leading-5 text-stone-600 dark:text-stone-400">
                        {issue.detail}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {audit && !audit.issues.length && (
                <div className="col-span-full rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center text-emerald-800">
                  <CheckCircle2 className="mx-auto h-7 w-7" />
                  <p className="mt-2 text-sm font-bold">Kritik SEO sorunu bulunmadı.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="space-y-5">
            <h3 className="text-lg font-bold">Global site ve entity ayarları</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Site Adı" value={settings.siteName} onChange={(siteName) => setSettings({ ...settings, siteName })} />
              <Field label="Yazar Adı" value={settings.authorName} onChange={(authorName) => setSettings({ ...settings, authorName })} />
              <Field label="Varsayılan Meta Başlık" value={settings.metaTitle} onChange={(metaTitle) => setSettings({ ...settings, metaTitle })} wide />
              <TextArea label="Varsayılan Meta Açıklama" value={settings.metaDescription} onChange={(metaDescription) => setSettings({ ...settings, metaDescription })} />
              <Field label="Başlık Şablonu" value={settings.titleTemplate} onChange={(titleTemplate) => setSettings({ ...settings, titleTemplate })} />
              <Field label="Canonical Origin (deployment ayarı)" value={SITE_URL} readOnly />
              <Field label="Odak Konular (virgülle)" value={settings.keywords} onChange={(keywords) => setSettings({ ...settings, keywords })} wide />
              <Field label="Alternatif Ad" value={settings.alternateName} onChange={(alternateName) => setSettings({ ...settings, alternateName })} />
              <Field label="ORCID Profil URL" value={settings.orcidUrl} onChange={(orcidUrl) => setSettings({ ...settings, orcidUrl })} />
              <Field label="Google Scholar URL" value={settings.scholarUrl} onChange={(scholarUrl) => setSettings({ ...settings, scholarUrl })} />
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-stone-200 p-4 text-sm font-bold dark:border-stone-700">
              <input type="checkbox" checked={settings.allowIndexing} onChange={(event) => setSettings({ ...settings, allowIndexing: event.target.checked })} />
              Production sayfalarının indekslenmesine izin ver
            </label>
            <div className="flex justify-end">
              <button onClick={saveSettings} disabled={busy === 'settings'} className="seo-primary-button">
                <Save className="h-4 w-4" /> Site ayarlarını kaydet
              </button>
            </div>
          </div>
        )}

        {tab === 'pages' && selectedPage && (
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <div className="space-y-2">
              {pages.map((page) => (
                <button
                  type="button"
                  key={page.routeKey}
                  onClick={() => setSelectedRouteKey(page.routeKey)}
                  className={`w-full rounded-xl border p-3 text-left ${
                    selectedRouteKey === page.routeKey
                      ? 'border-stone-900 bg-stone-900 text-white dark:border-amber-500 dark:bg-amber-600 dark:text-stone-950'
                      : 'border-stone-200 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800'
                  }`}
                >
                  <span className="block text-xs font-bold">{page.title || page.routeKey}</span>
                  <span className="mt-1 block truncate text-[11px] opacity-70">{page.path}</span>
                  <span className="mt-2 flex flex-wrap gap-1 text-[9px] font-black uppercase tracking-wide">
                    <span className={`rounded px-1.5 py-0.5 ${page.index ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>
                      {page.index ? 'index' : 'noindex'}
                    </span>
                    <span className={`rounded px-1.5 py-0.5 ${page.title && page.description ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'}`}>
                      {page.title && page.description ? 'metadata hazır' : 'metadata eksik'}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <div className="space-y-4">
              <Field label="Sayfa Yolu" value={selectedPage.path} onChange={(path) => updateSelectedPage({ path })} />
              <Field label="SEO Başlığı" value={selectedPage.title || ''} onChange={(title) => updateSelectedPage({ title })} />
              <TextArea label="Meta Açıklama" value={selectedPage.description || ''} onChange={(description) => updateSelectedPage({ description })} />
              <SerpWidthHint
                title={selectedPage.title || ''}
                description={selectedPage.description || ''}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Odak Sorgu" value={selectedPage.focusKeyword || ''} onChange={(focusKeyword) => updateSelectedPage({ focusKeyword })} />
                <Field label="Konu Kümesi" value={selectedPage.topicCluster || ''} onChange={(topicCluster) => updateSelectedPage({ topicCluster })} />
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">Arama niyeti</span>
                <select
                  value={selectedPage.searchIntent || 'informational'}
                  onChange={(event) => updateSelectedPage({ searchIntent: event.target.value as SeoPage['searchIntent'] })}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm outline-none focus:border-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                >
                  <option value="informational">Bilgilendirici</option>
                  <option value="academic">Akademik</option>
                  <option value="navigational">Marka / navigasyon</option>
                  <option value="transactional">İşlem odaklı</option>
                </select>
              </label>
              <Field label="İlişkili Sorgular (virgülle)" value={selectedPage.relatedKeywords.join(', ')} onChange={(value) => updateSelectedPage({ relatedKeywords: value.split(',').map((item) => item.trim()).filter(Boolean) })} />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="OG başlık override" value={selectedPage.ogTitle || ''} onChange={(ogTitle) => updateSelectedPage({ ogTitle })} />
                <Field label="OG görsel override URL" value={selectedPage.ogImageUrl || ''} onChange={(ogImageUrl) => updateSelectedPage({ ogImageUrl })} />
              </div>
              <TextArea label="OG açıklama override" value={selectedPage.ogDescription || ''} onChange={(ogDescription) => updateSelectedPage({ ogDescription })} />
              <Field label="Gelişmiş Canonical Override" value={selectedPage.canonicalOverride || ''} onChange={(canonicalOverride) => updateSelectedPage({ canonicalOverride })} />
              <div className="flex flex-wrap gap-5 text-xs font-bold">
                <Check label="Index" checked={selectedPage.index} onChange={(index) => updateSelectedPage({ index })} />
                <Check label="Follow" checked={selectedPage.follow} onChange={(follow) => updateSelectedPage({ follow })} />
                <Check label="Sitemap’e dahil et" checked={selectedPage.includeInSitemap} onChange={(includeInSitemap) => updateSelectedPage({ includeInSitemap })} />
              </div>
              <div className="flex justify-end">
                <button onClick={savePage} disabled={busy === 'page'} className="seo-primary-button">
                  <Save className="h-4 w-4" /> Sayfayı kaydet
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'social' && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Varsayılan OG Görsel URL" value={settings.ogImageUrl} onChange={(ogImageUrl) => setSettings({ ...settings, ogImageUrl })} />
              <Field label="X / Twitter Kullanıcı Adı" value={settings.twitterHandle} onChange={(twitterHandle) => setSettings({ ...settings, twitterHandle })} />
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-bold hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700">
              <ImageIcon className="h-4 w-4" />
              {busy === 'social-upload' ? 'Yükleniyor…' : '1200×630 sosyal kart yükle'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                className="sr-only"
                disabled={busy === 'social-upload'}
                onChange={uploadSocialCard}
              />
            </label>
            <div className="max-w-2xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-950">
              <div className="aspect-[1200/630] bg-stone-100 dark:bg-stone-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {settings.ogImageUrl ? <img src={settings.ogImageUrl} alt="Sosyal kart önizlemesi" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="space-y-1 p-4">
                <p className="text-[10px] uppercase tracking-wider text-stone-400">muhammedakan.com</p>
                <p className="font-bold">{settings.metaTitle}</p>
                <p className="line-clamp-2 text-xs text-stone-500">{settings.metaDescription}</p>
              </div>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <SerpPreview
                label="Google mobil önizleme"
                widthClass="max-w-[360px]"
                title={selectedPage?.title || settings.metaTitle}
                description={selectedPage?.description || settings.metaDescription}
                path={selectedPage?.path || '/'}
              />
              <SerpPreview
                label="Google masaüstü önizleme"
                widthClass="max-w-[600px]"
                title={selectedPage?.title || settings.metaTitle}
                description={selectedPage?.description || settings.metaDescription}
                path={selectedPage?.path || '/'}
              />
            </div>
            <div className="flex justify-end">
              <button onClick={saveSettings} className="seo-primary-button"><Save className="h-4 w-4" /> Sosyal ayarları kaydet</button>
            </div>
          </div>
        )}

        {tab === 'schema' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 className="mr-2 inline h-4 w-4" />
              WebSite → ProfilePage → Person grafiği güvenli form alanlarından otomatik üretilir.
            </div>
            <pre className="max-h-[560px] overflow-auto rounded-xl bg-stone-950 p-5 text-xs leading-6 text-emerald-300">
              {JSON.stringify(schemaPreview, null, 2)}
            </pre>
          </div>
        )}

        {tab === 'indexing' && (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <ExternalCard href={`${SITE_URL}/robots.txt`} label="robots.txt dosyasını aç" />
              <ExternalCard href={`${SITE_URL}/sitemap.xml`} label="sitemap.xml dosyasını aç" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">robots.txt önizlemesi</p>
                <pre className="overflow-auto rounded-xl bg-stone-950 p-4 text-xs leading-6 text-emerald-300">{`User-Agent: *
Allow: /
Disallow: /api/

Host: ${SITE_URL}
Sitemap: ${SITE_URL}/sitemap.xml`}</pre>
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">Sitemap’e girecek sistem yolları</p>
                <pre className="max-h-48 overflow-auto rounded-xl bg-stone-950 p-4 text-xs leading-6 text-sky-300">{pages.filter((page) => page.index && page.includeInSitemap && !page.canonicalOverride).map((page) => page.path).join('\n') || 'Yol bulunamadı'}</pre>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Eski Yol" value={redirectDraft.fromPath} onChange={(fromPath) => setRedirectDraft({ ...redirectDraft, fromPath })} />
              <Field label="Yeni Yol" value={redirectDraft.toPath} onChange={(toPath) => setRedirectDraft({ ...redirectDraft, toPath })} />
              <Field label="Neden" value={redirectDraft.reason} onChange={(reason) => setRedirectDraft({ ...redirectDraft, reason })} />
            </div>
            <button onClick={saveRedirect} disabled={busy === 'redirect'} className="seo-primary-button">
              <Plus className="h-4 w-4" /> 308 redirect ekle
            </button>
            <div className="space-y-2">
              {redirects.map((redirect) => (
                <div key={redirect.id} className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 p-4 text-xs dark:border-stone-700">
                  <div className="min-w-0">
                    <p className="truncate font-mono font-bold">{redirect.fromPath} → {redirect.toPath}</p>
                    <p className="mt-1 text-stone-500">{redirect.statusCode} · {redirect.reason || 'Manuel redirect'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleRedirect(redirect)} className="seo-secondary-button">
                      {redirect.isActive ? 'Duraklat' : 'Etkinleştir'}
                    </button>
                    <button onClick={() => deleteRedirect(redirect.id)} aria-label="Redirecti sil" className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'keywords' && (
          <div className="space-y-7 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead><tr className="border-b border-stone-200 dark:border-stone-700"><th className="p-3">Hedef Sayfa</th><th className="p-3">Odak Sorgu</th><th className="p-3">Konu Kümesi</th><th className="p-3">İlişkili Sorgular</th></tr></thead>
              <tbody>{pages.map((page) => {
                const duplicates = pages.filter((candidate) => candidate.focusKeyword && candidate.focusKeyword.toLocaleLowerCase('tr-TR') === page.focusKeyword?.toLocaleLowerCase('tr-TR'));
                return <tr key={page.routeKey} className={`border-b border-stone-100 dark:border-stone-800 ${duplicates.length > 1 ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}><td className="p-3 font-mono">{page.path}</td><td className="p-3 font-bold">{page.focusKeyword || '—'}{duplicates.length > 1 && <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-[9px] text-amber-900">çakışma</span>}</td><td className="p-3">{page.topicCluster || '—'}</td><td className="p-3 text-stone-500">{page.relatedKeywords.join(', ') || '—'}</td></tr>;
              })}</tbody>
            </table>
            {!!insights?.gsc?.rows?.length && (
              <div>
                <h4 className="mb-3 text-sm font-bold">Search Console sorgu eşleştirmesi</h4>
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead><tr className="border-b border-stone-200 dark:border-stone-700"><th className="p-3">Sorgu</th><th className="p-3">Google’daki URL</th><th className="p-3">CMS hedefi</th><th className="p-3">Gösterim</th></tr></thead>
                  <tbody>{insights.gsc.rows.slice(0, 30).map((row: any, index: number) => {
                    let resultPath = '';
                    try { resultPath = new URL(row.keys?.[1] || '', SITE_URL).pathname; } catch {}
                    const mapped = pages.find((page) => page.path === resultPath);
                    return <tr key={`${row.keys?.join('-')}-${index}`} className="border-b border-stone-100 dark:border-stone-800"><td className="p-3 font-bold">{row.keys?.[0] || '—'}</td><td className="p-3 font-mono">{resultPath || '—'}</td><td className="p-3">{mapped?.focusKeyword || <span className="text-amber-700">Eşleştirilmemiş</span>}</td><td className="p-3">{row.impressions || 0}</td></tr>;
                  })}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'integrations' && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <IntegrationCard title="Google Search Console" connected={Boolean(insights?.gsc?.connected)} detail={insights?.gsc?.property || 'Service account bekleniyor'} />
              <IntegrationCard title="Google Analytics 4" connected={Boolean(insights?.ga4?.connected)} detail={insights?.ga4?.property || 'Property ID bekleniyor'} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Metric label="Tıklama" value={insights?.gsc?.totals?.clicks ?? '—'} />
              <Metric label="Gösterim" value={insights?.gsc?.totals?.impressions ?? '—'} />
              <Metric label="CTR" value={typeof insights?.gsc?.totals?.ctr === 'number' ? `${(insights.gsc.totals.ctr * 100).toFixed(1)}%` : '—'} />
              <Metric label="Ort. pozisyon" value={typeof insights?.gsc?.totals?.position === 'number' ? insights.gsc.totals.position.toFixed(1) : '—'} />
              <Metric label="Aktif kullanıcı" value={insights?.ga4?.totals?.activeUsers ?? '—'} />
              <Metric label="Oturum" value={insights?.ga4?.totals?.sessions ?? '—'} />
            </div>
            {!!insights?.gsc?.rows?.length && (
              <div className="overflow-x-auto">
                <h4 className="mb-3 text-sm font-bold">En iyi Search Console sorguları ve sayfaları</h4>
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead><tr className="border-b border-stone-200 dark:border-stone-700"><th className="p-2">Sorgu</th><th className="p-2">Sayfa</th><th className="p-2">Tıklama</th><th className="p-2">Gösterim</th><th className="p-2">Pozisyon</th></tr></thead>
                  <tbody>{insights.gsc.rows.slice(0, 20).map((row: any, index: number) => <tr key={`${row.keys?.join('-')}-${index}`} className="border-b border-stone-100 dark:border-stone-800"><td className="p-2 font-bold">{row.keys?.[0] || '—'}</td><td className="max-w-xs truncate p-2">{row.keys?.[1] || '—'}</td><td className="p-2">{row.clicks || 0}</td><td className="p-2">{row.impressions || 0}</td><td className="p-2">{Number(row.position || 0).toFixed(1)}</td></tr>)}</tbody>
                </table>
              </div>
            )}
            {!!insights?.ga4?.rows?.length && (
              <div className="overflow-x-auto">
                <h4 className="mb-3 text-sm font-bold">GA4 en iyi sayfalar</h4>
                <table className="w-full min-w-[560px] text-left text-xs">
                  <thead><tr className="border-b border-stone-200 dark:border-stone-700"><th className="p-2">Sayfa</th><th className="p-2">Kullanıcı</th><th className="p-2">Oturum</th><th className="p-2">Etkileşim</th></tr></thead>
                  <tbody>{insights.ga4.rows.slice(0, 20).map((row: any) => <tr key={row.pagePath} className="border-b border-stone-100 dark:border-stone-800"><td className="p-2 font-mono">{row.pagePath}</td><td className="p-2">{row.activeUsers}</td><td className="p-2">{row.sessions}</td><td className="p-2">{(row.engagementRate * 100).toFixed(1)}%</td></tr>)}</tbody>
                </table>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="GSC Property" value={settings.gscProperty} onChange={(gscProperty) => setSettings({ ...settings, gscProperty })} />
              <Field label="GA4 Property ID" value={settings.ga4PropertyId} onChange={(ga4PropertyId) => setSettings({ ...settings, ga4PropertyId })} />
              <Field label="GA4 Measurement ID" value={settings.ga4MeasurementId} onChange={(ga4MeasurementId) => setSettings({ ...settings, ga4MeasurementId })} />
              <Check label="Consent sonrasında analitiği etkinleştir" checked={settings.enableAnalytics} onChange={(enableAnalytics) => setSettings({ ...settings, enableAnalytics })} />
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => loadInsights(28)} className="seo-primary-button"><RefreshCw className={`h-4 w-4 ${busy === 'insights' ? 'animate-spin' : ''}`} /> Raporları yenile</button>
              <button onClick={async () => { try { await api('/api/admin/seo/insights', { method: 'POST' }); toast.success('Sitemap Search Console’a gönderildi.'); } catch (error) { toast.error(error instanceof Error ? error.message : 'Sitemap gönderilemedi.'); } }} className="seo-secondary-button">Sitemap’i gönder</button>
              <button onClick={saveSettings} className="seo-secondary-button"><Save className="h-4 w-4" /> Entegrasyon ayarlarını kaydet</button>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between"><h3 className="text-lg font-bold">Son 50 SEO revizyonu</h3><button onClick={loadHistory} className="seo-secondary-button"><RefreshCw className="h-4 w-4" /> Yenile</button></div>
            {revisions.map((revision) => (
              <div key={revision.id} className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 p-4 dark:border-stone-700">
                <div><p className="text-sm font-bold">{revision.entityType} · {revision.entityKey}</p><p className="mt-1 text-xs text-stone-500"><Clock3 className="mr-1 inline h-3.5 w-3.5" />{new Date(revision.createdAt).toLocaleString('tr-TR')}</p></div>
                <button onClick={async () => { try { await api('/api/admin/seo/revisions', { method: 'PATCH', body: JSON.stringify({ id: revision.id }) }); toast.success('Revizyon geri yüklendi.'); await loadHistory(); } catch (error) { toast.error(error instanceof Error ? error.message : 'Geri yüklenemedi.'); } }} className="seo-secondary-button">Geri yükle</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

function Field({ label, value, onChange, readOnly = false, wide = false }: { label: string; value: string; onChange?: (value: string) => void; readOnly?: boolean; wide?: boolean }) {
  return <label className={`block ${wide ? 'md:col-span-2' : ''}`}><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">{label}</span><input value={value} readOnly={readOnly} onChange={(event) => onChange?.(event.target.value)} className={`w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm outline-none focus:border-stone-900 dark:border-stone-700 dark:bg-stone-800 ${readOnly ? 'bg-stone-100 text-stone-500' : 'bg-stone-50 dark:text-stone-100'}`} /></label>;
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block md:col-span-2"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">{label}</span><textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3.5 text-sm outline-none focus:border-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100" /></label>;
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="inline-flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />{label}</label>;
}

function ExternalCard({ href, label }: { href: string; label: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl border border-stone-200 p-4 text-sm font-bold hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"><span className="inline-flex items-center gap-2"><Globe className="h-4 w-4" />{label}</span><ExternalLink className="h-4 w-4" /></a>;
}

function IntegrationCard({ title, connected, detail }: { title: string; connected: boolean; detail: string }) {
  return <div className="rounded-xl border border-stone-200 p-5 dark:border-stone-700"><div className="flex items-center justify-between"><p className="font-bold">{title}</p>{connected ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <KeyRound className="h-5 w-5 text-amber-600" />}</div><p className="mt-2 text-xs text-stone-500">{detail}</p></div>;
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-xl bg-stone-100 p-5 dark:bg-stone-800"><p className="text-xs font-bold uppercase tracking-wider text-stone-500">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>;
}

function SerpPreview({ label, widthClass, title, description, path }: { label: string; widthClass: string; title: string; description: string; path: string }) {
  return <div className="rounded-xl border border-stone-200 p-4 dark:border-stone-700"><p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-stone-500">{label}</p><div className={widthClass}><p className="truncate text-xs text-emerald-800 dark:text-emerald-400">https://www.muhammedakan.com{path === '/' ? '' : path}</p><p className="mt-1 truncate text-lg text-[#1a0dab] dark:text-sky-400">{title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-600 dark:text-stone-300">{description}</p></div><p className="mt-3 text-[10px] text-stone-400">Google kırpmayı sorgu ve cihaza göre değiştirebilir; bu önizleme editoryal uyarıdır.</p></div>;
}

function SerpWidthHint({ title, description }: { title: string; description: string }) {
  const [widths, setWidths] = useState({ title: 0, description: 0 });
  useEffect(() => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;
    context.font = '20px Arial';
    const titleWidth = Math.round(context.measureText(title).width);
    context.font = '14px Arial';
    const descriptionWidth = Math.round(context.measureText(description).width);
    setWidths({ title: titleWidth, description: descriptionWidth });
  }, [description, title]);
  const warning = widths.title > 580 || widths.description > 920;
  return <p className={`rounded-xl border p-3 text-xs ${warning ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200' : 'border-stone-200 bg-stone-50 text-stone-500 dark:border-stone-700 dark:bg-stone-800'}`}>Yaklaşık SERP genişliği: başlık {widths.title}px, açıklama {widths.description}px. Bu değerler yayınlamayı engellemez; okunabilirlik ve olası kırpma için uyarıdır.</p>;
}
