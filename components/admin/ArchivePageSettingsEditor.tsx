'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, Globe2, Save, Search, Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { readSessionItem } from '@/lib/admin-session-storage';
import type { SeoPage } from '@/lib/types';

type ArchiveKind = 'articles' | 'publications' | 'projects';

const ARCHIVES: Record<
  ArchiveKind,
  { routeKey: string; path: string; label: string }
> = {
  publications: {
    routeKey: 'publications:index',
    path: '/yayinlar',
    label: 'Yayın arşivi',
  },
  projects: {
    routeKey: 'projects:index',
    path: '/projeler',
    label: 'Proje arşivi',
  },
  articles: {
    routeKey: 'articles:index',
    path: '/yazilar',
    label: 'Yazı arşivi',
  },
};

interface ArchivePageSettingsEditorProps {
  kind: ArchiveKind;
}

function splitKeywords(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30);
}

export function ArchivePageSettingsEditor({
  kind,
}: ArchivePageSettingsEditorProps) {
  const archive = ARCHIVES[kind];
  const [page, setPage] = useState<SeoPage | null>(null);
  const [relatedKeywords, setRelatedKeywords] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const token = readSessionItem('admin_token') || '';
    fetch(`/api/admin/seo/pages/${encodeURIComponent(archive.routeKey)}`, {
      cache: 'no-store',
      headers: token ? { 'X-Admin-Token': token } : {},
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error?.message || 'Arşiv ayarları alınamadı.');
        }
        return payload.data as SeoPage;
      })
      .then((value) => {
        if (!active) return;
        setPage(value);
        setRelatedKeywords((value.relatedKeywords || []).join(', '));
      })
      .catch((error) => {
        if (active) {
          toast.error(
            error instanceof Error
              ? error.message
              : 'Arşiv ayarları alınamadı.'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [archive.routeKey]);

  const searchPreviewTitle = useMemo(
    () => page?.title || page?.presentation?.heading || archive.label,
    [archive.label, page]
  );

  const update = (patch: Partial<SeoPage>) => {
    setPage((current) => (current ? { ...current, ...patch } : current));
  };

  const updatePresentation = (
    patch: NonNullable<SeoPage['presentation']>
  ) => {
    setPage((current) =>
      current
        ? {
            ...current,
            presentation: { ...current.presentation, ...patch },
          }
        : current
    );
  };

  async function save() {
    if (!page) return;
    setSaving(true);
    try {
      const token = readSessionItem('admin_token') || '';
      const response = await fetch(
        `/api/admin/seo/pages/${encodeURIComponent(archive.routeKey)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'X-Admin-Token': token } : {}),
          },
          body: JSON.stringify({
            ...page,
            path: archive.path,
            locale: page.locale || 'tr',
            relatedKeywords: splitKeywords(relatedKeywords),
            presentation: {
              eyebrow: page.presentation?.eyebrow || '',
              heading: page.presentation?.heading || '',
              intro: page.presentation?.intro || '',
            },
          }),
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.error?.message || 'Arşiv sayfası ayarları kaydedilemedi.'
        );
      }
      const saved = payload.data as SeoPage;
      setPage(saved);
      setRelatedKeywords((saved.relatedKeywords || []).join(', '));
      toast.success(`${archive.label} görünümü ve SEO ayarları kaydedildi.`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Arşiv sayfası ayarları kaydedilemedi.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="group rounded-2xl border border-stone-200 bg-stone-50/70 dark:border-stone-700 dark:bg-stone-800/40">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 marker:hidden sm:p-5">
        <span className="flex min-w-0 items-center gap-3">
          <span className="rounded-xl border border-stone-200 bg-white p-2 text-amber-700 dark:border-stone-700 dark:bg-stone-900 dark:text-amber-400">
            <Settings2 className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-black">Arşiv sayfası görünümü ve SEO</span>
            <span className="mt-0.5 block truncate text-xs text-stone-500">
              Üst başlık, açıklama, arama sonucu ve indeks ayarları
            </span>
          </span>
        </span>
        <span className="text-xs font-bold text-stone-500 group-open:hidden">Düzenle</span>
        <span className="hidden text-xs font-bold text-stone-500 group-open:inline">Kapat</span>
      </summary>

      <div className="border-t border-stone-200 p-4 dark:border-stone-700 sm:p-5">
        {loading && (
          <p className="text-sm text-stone-500">Arşiv ayarları yükleniyor…</p>
        )}
        {!loading && !page && (
          <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
            Arşiv ayarları yüklenemedi. SEO Ayarları sekmesinden bağlantıyı kontrol edin.
          </p>
        )}
        {page && (
          <div className="space-y-6">
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Eye className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-wider">Sayfada görünen üst alan</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Kısa üst etiket"
                  value={page.presentation?.eyebrow || ''}
                  onChange={(eyebrow) => updatePresentation({ eyebrow })}
                  hint="Örn. Akademik üretim"
                />
                <Field
                  label="Görünen ana başlık (H1)"
                  value={page.presentation?.heading || ''}
                  onChange={(heading) => updatePresentation({ heading })}
                  hint="Okuyucunun sayfada göreceği tek ana başlık"
                />
                <Area
                  label="Arşiv giriş metni"
                  value={page.presentation?.intro || ''}
                  onChange={(intro) => updatePresentation({ intro })}
                  hint="Arşivin kapsamını 1–2 özgün cümlede açıklayın."
                />
              </div>
            </section>

            <section className="border-t border-stone-200 pt-5 dark:border-stone-700">
              <div className="mb-3 flex items-center gap-2">
                <Search className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-wider">Arama ve paylaşım görünümü</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="SEO başlığı"
                  value={page.title || ''}
                  onChange={(title) => update({ title })}
                  hint="Yaklaşık 50–60 karakter; kişi adı ve arşiv türünü içersin."
                />
                <Field
                  label="Odak sorgu"
                  value={page.focusKeyword || ''}
                  onChange={(focusKeyword) => update({ focusKeyword })}
                  hint="Sayfanın cevapladığı birincil arama sorgusu"
                />
                <Area
                  label="Meta açıklaması"
                  value={page.description || ''}
                  onChange={(description) => update({ description })}
                  hint="Yaklaşık 140–160 karakter; doğal, açıklayıcı ve özgün olsun."
                />
                <Field
                  label="İlişkili sorgular (virgülle)"
                  value={relatedKeywords}
                  onChange={setRelatedKeywords}
                  hint="Yakın anlamlı ve konuya doğrudan bağlı sorgular"
                  wide
                />
                <Field
                  label="Konu kümesi"
                  value={page.topicCluster || ''}
                  onChange={(topicCluster) => update({ topicCluster })}
                  hint="İçeriklerin bağlı olduğu ana akademik konu"
                />
                <Field
                  label="Sosyal paylaşım başlığı"
                  value={page.ogTitle || ''}
                  onChange={(ogTitle) => update({ ogTitle })}
                  hint="Boş bırakılırsa SEO başlığı kullanılır."
                />
                <Area
                  label="Sosyal paylaşım açıklaması"
                  value={page.ogDescription || ''}
                  onChange={(ogDescription) => update({ ogDescription })}
                  hint="Boş bırakılırsa meta açıklaması kullanılır."
                />
                <Field
                  label="Sosyal kart görseli URL"
                  value={page.ogImageUrl || ''}
                  onChange={(ogImageUrl) => update({ ogImageUrl })}
                  hint="1200×630 px önerilir."
                  wide
                />
              </div>

              <div className="mt-4 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">www.muhammedakan.com{archive.path}</p>
                <p className="mt-1 line-clamp-1 text-base font-semibold text-[#1a0dab] dark:text-sky-300">{searchPreviewTitle}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-600 dark:text-stone-400">{page.description || page.presentation?.intro || 'Meta açıklaması girilmedi.'}</p>
              </div>
            </section>

            <section className="border-t border-stone-200 pt-5 dark:border-stone-700">
              <div className="mb-3 flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-wider">İndeksleme</h3>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <CheckField label="Arama motorları indekslesin" checked={page.index} onChange={(index) => update({ index })} />
                <CheckField label="Bağlantıları takip etsin" checked={page.follow} onChange={(follow) => update({ follow })} />
                <CheckField label="Sitemap’e dahil et" checked={page.includeInSitemap} onChange={(includeInSitemap) => update({ includeInSitemap })} />
              </div>
            </section>

            <div className="flex justify-end">
              <button type="button" onClick={save} disabled={saving} className="seo-primary-button">
                <Save className="h-4 w-4" />
                {saving ? 'Kaydediliyor…' : 'Arşiv ayarlarını kaydet'}
              </button>
            </div>
          </div>
        )}
      </div>
    </details>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint: string;
  wide?: boolean;
}) {
  return (
    <label className={wide ? 'md:col-span-2' : ''}>
      <span className="editor-label">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="editor-input" />
      <span className="mt-1.5 block text-[11px] leading-4 text-stone-500">{hint}</span>
    </label>
  );
}

function Area({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint: string;
}) {
  return (
    <label className="md:col-span-2">
      <span className="editor-label">{label}</span>
      <textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} className="editor-input resize-y" />
      <span className="mt-1.5 block text-[11px] leading-4 text-stone-500">{hint}</span>
    </label>
  );
}

function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 text-xs font-semibold dark:border-stone-700 dark:bg-stone-900">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-amber-600" />
      <span>{label}</span>
    </label>
  );
}
