'use client';

import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  BarChart3,
  BookOpen,
  Copy,
  Edit3,
  ExternalLink,
  FileText,
  GitBranch,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { ArticleItem, ContentStatus, ProjectItem, PublicationItem } from '@/lib/types';
import { isContentPublished, slugifyTurkish } from '@/lib/seo';
import { readSessionItem } from '@/lib/admin-session-storage';
import {
  firstValidationMessage,
  normalizeOptionalUrl,
} from '@/lib/admin-content-utils';
import {
  contentReadiness,
  fromDateTimeLocalValue,
  sortArchiveContent,
  toDateTimeLocalValue,
} from '@/lib/content-presentation';
import { ArchivePageSettingsEditor } from '@/components/admin/ArchivePageSettingsEditor';
import { ContentImageUploader } from '@/components/admin/ContentImageUploader';

type Kind = 'articles' | 'publications' | 'projects';
type CmsItem = ArticleItem | PublicationItem | ProjectItem;

interface ContentPublishingEditorProps {
  kind: Kind;
  initialItems: CmsItem[];
  availablePublications?: PublicationItem[];
  onChange?: (items: CmsItem[]) => void;
}

const LABELS = {
  articles: {
    title: 'Akademik Yazılar',
    description: 'Kaynaklı araştırma notlarını taslak, zamanlanmış veya yayınlanmış olarak yönetin.',
    singular: 'Yazı',
    icon: FileText,
  },
  publications: {
    title: 'Akademik Yayınlar',
    description: 'Bibliyografik kayıtları ve yeterli içerik hazır olduğunda indekslenebilir detay sayfalarını yönetin.',
    singular: 'Yayın',
    icon: BookOpen,
  },
  projects: {
    title: 'Akademik Projeler',
    description: 'Proje kayıtlarını, çıktılarını ve indekslenebilir detay sayfalarını yönetin.',
    singular: 'Proje',
    icon: GitBranch,
  },
} as const;

function emptyItem(kind: Kind): Record<string, any> {
  const common = {
    slug: '',
    locale: 'tr',
    excerpt: '',
    content: '',
    coverImageUrl: '',
    coverImageAlt: '',
    publishedAt: '',
    isFeatured: false,
    sortOrder: 0,
  };
  if (kind === 'articles') {
    return {
      ...common,
      title: '',
      status: 'draft',
      authorName: 'Muhammed Akan',
      relatedKeywords: [],
      topicCluster: '',
      references: [],
    };
  }
  if (kind === 'publications') {
    return {
      ...common,
      type: 'Makale',
      title: '',
      publisher: '',
      year: String(new Date().getFullYear()),
      url: '',
      doi: '',
      detailStatus: 'none',
    };
  }
  return {
    ...common,
    title: '',
    description: '',
    years: String(new Date().getFullYear()),
    tags: [],
    relatedPublicationIds: [],
    url: '',
    detailStatus: 'none',
  };
}

function statusOf(kind: Kind, item: Record<string, any>): ContentStatus {
  return kind === 'articles' ? item.status || 'draft' : item.detailStatus || 'none';
}

function normalizeRow(kind: Kind, row: Record<string, any>): CmsItem {
  const common = {
    id: row.id,
    slug: row.slug || '',
    locale: row.locale || 'tr',
    translationGroupId: row.translation_group_id || row.translationGroupId || '',
    excerpt: row.excerpt || '',
    content: row.content || '',
    coverImageUrl: normalizeOptionalUrl(row.cover_image_url || row.coverImageUrl || '') as string,
    coverImageAlt: row.cover_image_alt || row.coverImageAlt || '',
    publishedAt: row.published_at || row.publishedAt || '',
    updatedAt: row.updated_at || row.updatedAt || '',
    isFeatured: row.is_featured ?? row.isFeatured ?? false,
    sortOrder: row.sort_order ?? row.sortOrder ?? 0,
  };
  if (kind === 'articles') {
    return {
      ...common,
      title: row.title,
      status: row.status,
      authorName: row.author_name || row.authorName || '',
      relatedKeywords: row.related_keywords || row.relatedKeywords || [],
      topicCluster: row.topic_cluster || row.topicCluster || '',
      references: row.references || [],
    } as ArticleItem;
  }
  if (kind === 'publications') {
    return {
      ...common,
      type: row.type,
      title: row.title,
      publisher: row.publisher || '',
      year: row.year,
      url: normalizeOptionalUrl(row.url || '') as string,
      doi: row.doi || '',
      detailStatus: row.detail_status || row.detailStatus || 'none',
    } as PublicationItem;
  }
  return {
    ...common,
    title: row.title,
    description: row.description || '',
    years: row.years,
    tags: row.tags || [],
    relatedPublicationIds:
      row.related_publication_ids || row.relatedPublicationIds || [],
    url: normalizeOptionalUrl(row.url || '') as string,
    detailStatus: row.detail_status || row.detailStatus || 'none',
  } as ProjectItem;
}

export function ContentPublishingEditor({
  kind,
  initialItems,
  availablePublications = [],
  onChange,
}: ContentPublishingEditorProps) {
  const copy = LABELS[kind];
  const Icon = copy.icon;
  const [items, setItems] = useState<CmsItem[]>(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>(emptyItem(kind));
  const [busy, setBusy] = useState(false);
  const [listInputs, setListInputs] = useState({ tags: '', relatedKeywords: '', references: '' });
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all');

  const orderedItems = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr-TR');
    return sortArchiveContent(items).filter((item) => {
      if (statusFilter !== 'all' && statusOf(kind, item as Record<string, any>) !== statusFilter) return false;
      if (!needle) return true;
      const searchable = [
        item.title,
        item.slug,
        'type' in item ? item.type : '',
        'publisher' in item ? item.publisher : '',
        'description' in item ? item.description : '',
        'topicCluster' in item ? item.topicCluster : '',
      ].join(' ').toLocaleLowerCase('tr-TR');
      return searchable.includes(needle);
    });
  }, [items, kind, query, statusFilter]);

  const stats = useMemo(
    () => ({
      total: items.length,
      published: items.filter((item) =>
        isContentPublished(
          statusOf(kind, item as Record<string, any>),
          item.publishedAt
        )
      ).length,
      draft: items.filter((item) =>
        ['none', 'draft'].includes(statusOf(kind, item as Record<string, any>))
      ).length,
      featured: items.filter((item) => item.isFeatured).length,
    }),
    [items, kind]
  );

  useEffect(() => {
    let active = true;
    request(`/api/admin/content/${kind}`, { method: 'GET' })
      .then((rows) => {
        if (!active || !Array.isArray(rows)) return;
        const next = rows.map((row) => normalizeRow(kind, row));
        setItems(next);
        onChange?.(next);
      })
      .catch(() => {
        // The initial CMS snapshot remains usable when the v2 migration is pending.
      });
    return () => {
      active = false;
    };
    // The content kind is stable for the lifetime of each tab instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  function startCreate() {
    setEditingId('new');
    setForm(emptyItem(kind));
    setListInputs({ tags: '', relatedKeywords: '', references: '' });
    setValidationErrors({});
  }

  function startEdit(item: CmsItem) {
    const value = { ...item } as Record<string, any>;
    setEditingId(item.id);
    setForm(value);
    setListInputs({
      tags: (value.tags || []).join(', '),
      relatedKeywords: (value.relatedKeywords || []).join(', '),
      references: (value.references || []).join('\n'),
    });
    setValidationErrors({});
  }

  function duplicate(item: CmsItem) {
    const value = { ...item } as Record<string, any>;
    const title = `${item.title} (Kopya)`;
    setEditingId('new');
    setForm({
      ...value,
      id: undefined,
      title,
      slug: `${slugifyTurkish(item.title)}-kopya`,
      publishedAt: '',
      ...(kind === 'articles'
        ? { status: 'draft' }
        : { detailStatus: 'draft' }),
    });
    setListInputs({
      tags: (value.tags || []).join(', '),
      relatedKeywords: (value.relatedKeywords || []).join(', '),
      references: (value.references || []).join('\n'),
    });
    setValidationErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancel() {
    setEditingId(null);
    setForm(emptyItem(kind));
    setListInputs({ tags: '', relatedKeywords: '', references: '' });
    setValidationErrors({});
  }

  async function request(input: string, init: RequestInit) {
    const token = readSessionItem('admin_token') || '';
    const response = await fetch(input, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'X-Admin-Token': token } : {}),
        ...(init.headers || {}),
      },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      const error = new Error(
        firstValidationMessage(
          payload?.error?.fields,
          payload?.error?.message || 'İşlem tamamlanamadı.'
        )
      ) as Error & { fields?: Record<string, string[]> };
      error.fields = payload?.error?.fields;
      throw error;
    }
    return payload.data;
  }

  async function save() {
    const title = String(form.title || '').trim();
    if (title.length < 3) {
      toast.error('Başlık en az 3 karakter olmalıdır.');
      return;
    }
    const slug = String(form.slug || slugifyTurkish(title)).trim();
    const payload: Record<string, any> = {
      ...form,
      ...(editingId !== 'new' ? { id: editingId } : {}),
      title,
      slug,
      locale: form.locale || 'tr',
      excerpt: String(form.excerpt || ''),
      content: String(form.content || ''),
      coverImageUrl: String(form.coverImageUrl || ''),
      coverImageAlt: String(form.coverImageAlt || ''),
      publishedAt: form.publishedAt || '',
      isFeatured: Boolean(form.isFeatured),
      sortOrder: Number.isFinite(Number(form.sortOrder))
        ? Number(form.sortOrder)
        : 0,
    };
    if (kind === 'articles') {
      payload.relatedKeywords = listInputs.relatedKeywords.split(',').map((value) => value.trim()).filter(Boolean);
      payload.references = listInputs.references.split('\n').map((value) => value.trim()).filter(Boolean);
    }
    if (kind === 'projects') {
      payload.tags = listInputs.tags.split(',').map((value) => value.trim()).filter(Boolean);
    }

    setBusy(true);
    setValidationErrors({});
    try {
      const saved = normalizeRow(
        kind,
        await request(`/api/admin/content/${kind}`, {
          method: editingId === 'new' ? 'POST' : 'PATCH',
          body: JSON.stringify(payload),
        })
      );
      const next = editingId === 'new'
        ? [saved, ...items]
        : items.map((item) => (item.id === editingId ? saved : item));
      setItems(next);
      onChange?.(next);
      toast.success(`${copy.singular} kaydedildi.`);
      cancel();
    } catch (error) {
      const fields = (error as Error & { fields?: Record<string, string[]> }).fields;
      if (fields) setValidationErrors(fields);
      toast.error(error instanceof Error ? error.message : 'İçerik kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: CmsItem) {
    if (!window.confirm(`“${item.title}” kaydını silmek istediğinize emin misiniz?`)) return;
    setBusy(true);
    try {
      await request(`/api/admin/content/${kind}?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      const next = items.filter((candidate) => candidate.id !== item.id);
      setItems(next);
      onChange?.(next);
      toast.success(`${copy.singular} silindi.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'İçerik silinemedi.');
    } finally {
      setBusy(false);
    }
  }

  async function preview() {
    const slug = String(form.slug || slugifyTurkish(form.title || '')).trim();
    if (!slug) {
      toast.error('Önizleme için önce bir başlık ve URL kısa adı girin.');
      return;
    }
    try {
      const result = await request('/api/admin/preview', {
        method: 'POST',
        body: JSON.stringify({ kind, slug, locale: form.locale || 'tr' }),
      });
      window.open(result.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Önizleme açılamadı.');
    }
  }

  const currentStatus = statusOf(kind, form);
  const statusKey = kind === 'articles' ? 'status' : 'detailStatus';
  const readiness = contentReadiness({
    ...form,
    slug: form.slug || slugifyTurkish(form.title || ''),
  });
  const archivePrefix =
    kind === 'articles'
      ? 'yazilar'
      : kind === 'publications'
        ? 'yayinlar'
        : 'projeler';

  return (
    <section className="admin-panel-card space-y-6">
      <header className="flex flex-col justify-between gap-4 border-b border-stone-100 pb-4 dark:border-stone-800 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            {copy.title} Yönetimi
          </h2>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{copy.description}</p>
        </div>
        <button type="button" onClick={startCreate} disabled={Boolean(editingId) || busy} className="seo-primary-button">
          <Plus className="h-4 w-4" /> Yeni {copy.singular}
        </button>
      </header>

      <ArchivePageSettingsEditor kind={kind} />

      <section aria-label="İçerik özeti" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Toplam kayıt" value={stats.total} icon={BarChart3} />
        <StatCard label="Yayında" value={stats.published} tone="emerald" />
        <StatCard label="Taslak / kısa kayıt" value={stats.draft} tone="stone" />
        <StatCard label="Öne çıkan" value={stats.featured} icon={Sparkles} tone="amber" />
      </section>

      {editingId && (
        <div className="min-w-0 space-y-5 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/20 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black">{editingId === 'new' ? `Yeni ${copy.singular}` : `${copy.singular} düzenle`}</h3>
            <button type="button" onClick={cancel} aria-label="Düzenleyiciyi kapat" className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/5"><X className="h-4 w-4" /></button>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400">Yayın hazırlığı</p>
                <p className="mt-1 text-xs text-stone-500">Başlık, özet, ana metin, URL ve görsel erişilebilirliği birlikte kontrol edilir.</p>
              </div>
              <span className={`text-xl font-black ${readiness.score === 100 ? 'text-emerald-700 dark:text-emerald-400' : readiness.score >= 65 ? 'text-amber-700 dark:text-amber-400' : 'text-rose-700 dark:text-rose-400'}`}>%{readiness.score}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
              <div className={`${readiness.score === 100 ? 'bg-emerald-600' : readiness.score >= 65 ? 'bg-amber-600' : 'bg-rose-600'} h-full rounded-full transition-all`} style={{ width: `${readiness.score}%` }} />
            </div>
            {!!readiness.issues.length && (
              <ul className="mt-3 grid gap-1 text-[11px] text-stone-600 dark:text-stone-400 sm:grid-cols-2">
                {readiness.issues.map((issue) => <li key={issue}>• {issue}</li>)}
              </ul>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <EditorField label="Başlık" value={form.title || ''} onChange={(title) => setForm({ ...form, title, slug: form.slug || slugifyTurkish(title) })} hint="Açık, özgün ve içeriğin kapsamını anlatan bir başlık kullanın." wide />
            <EditorField label="URL kısa adı" value={form.slug || ''} onChange={(slug) => setForm({ ...form, slug: slugifyTurkish(slug) })} hint={`Kalıcı adres: /${archivePrefix}/${form.slug || slugifyTurkish(form.title || '')}`} />
            <label className="block">
              <span className="editor-label">Dil</span>
              <select value={form.locale || 'tr'} onChange={(event) => setForm({ ...form, locale: event.target.value })} className="editor-input">
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="block">
              <span className="editor-label">Detay durumu</span>
              <select value={currentStatus} onChange={(event) => setForm({ ...form, [statusKey]: event.target.value })} className="editor-input">
                {kind !== 'articles' && <option value="none">Yalnız ana sayfa kaydı</option>}
                <option value="draft">Taslak</option>
                <option value="scheduled">Zamanlanmış</option>
                <option value="published">Yayınlandı</option>
              </select>
            </label>
            <EditorCheckbox
              label="Arşivde öne çıkar"
              description="Bu içerik arşiv sıralamasında önce gösterilir."
              checked={Boolean(form.isFeatured)}
              onChange={(isFeatured) => setForm({ ...form, isFeatured })}
            />
            <EditorField
              label="Editoryal sıra"
              value={String(form.sortOrder ?? 0)}
              onChange={(sortOrder) => setForm({ ...form, sortOrder })}
              type="number"
              hint="Küçük sayı önce görünür; öne çıkarılan kayıtlar her zaman üsttedir."
            />
            <EditorArea label="Özet" value={form.excerpt || ''} onChange={(excerpt) => setForm({ ...form, excerpt })} rows={4} />
            <EditorArea label="Zengin içerik (Markdown destekli)" value={form.content || ''} onChange={(content) => setForm({ ...form, content })} rows={10} />
            <div className="md:col-span-2 -mt-2 rounded-xl bg-stone-100 px-4 py-3 text-[11px] leading-5 text-stone-600 dark:bg-stone-800 dark:text-stone-400">
              Markdown ipucu: <code>## Başlık</code>, <code>**kalın**</code>, <code>*italik*</code>, <code>- liste</code>, <code>1. sıralı liste</code> ve <code>[bağlantı](https://...)</code> desteklenir.
            </div>
            <ContentImageUploader value={form.coverImageUrl || ''} alt={form.coverImageAlt || ''} onChange={(coverImageUrl) => setForm({ ...form, coverImageUrl })} />
            <EditorField label="Kapak görseli URL" value={form.coverImageUrl || ''} onChange={(coverImageUrl) => setForm({ ...form, coverImageUrl })} hint="Yükleme yerine güvenilir bir HTTPS görsel adresi de kullanabilirsiniz." />
            <EditorField label="Kapak görseli alt metni" value={form.coverImageAlt || ''} onChange={(coverImageAlt) => setForm({ ...form, coverImageAlt })} hint="Görseli görmeyen kullanıcıya ne gösterdiğini kısa ve nesnel biçimde anlatın." />
            <EditorField label="Yayın / zamanlama tarihi" type="datetime-local" value={toDateTimeLocalValue(form.publishedAt)} onChange={(publishedAt) => setForm({ ...form, publishedAt: fromDateTimeLocalValue(publishedAt) })} hint="Zamanlanmış içerik bu tarihe ulaştığında otomatik olarak görünür." />

            {kind === 'publications' && (
              <>
                <EditorField label="Yayın türü" value={form.type || ''} onChange={(type) => setForm({ ...form, type })} />
                <EditorField label="Yıl" value={form.year || ''} onChange={(year) => setForm({ ...form, year })} />
                <EditorField label="Yayıncı / dergi" value={form.publisher || ''} onChange={(publisher) => setForm({ ...form, publisher })} />
                <EditorField label="DOI" value={form.doi || ''} onChange={(doi) => setForm({ ...form, doi })} />
                <EditorField label="Dış bağlantı" value={form.url || ''} onChange={(url) => setForm({ ...form, url })} wide />
              </>
            )}

            {kind === 'projects' && (
              <>
                <EditorField label="Yıllar" value={form.years || ''} onChange={(years) => setForm({ ...form, years })} />
                <EditorField label="Etiketler (virgülle)" value={listInputs.tags} onChange={(tags) => setListInputs({ ...listInputs, tags })} />
                <EditorArea label="Kısa proje açıklaması" value={form.description || ''} onChange={(description) => setForm({ ...form, description })} rows={4} />
                <EditorField label="Dış bağlantı" value={form.url || ''} onChange={(url) => setForm({ ...form, url })} />
                {!!availablePublications.length && (
                  <fieldset className="md:col-span-2 rounded-xl border border-stone-200 p-4 dark:border-stone-700">
                    <legend className="px-2 text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">İlgili yayınlar / çıktılar</legend>
                    <div className="grid gap-2 md:grid-cols-2">
                      {availablePublications.map((publication) => {
                        const selected = (form.relatedPublicationIds || []).includes(publication.id);
                        return <label key={publication.id} className="flex items-start gap-2 rounded-lg p-2 text-xs hover:bg-stone-100 dark:hover:bg-stone-800"><input type="checkbox" checked={selected} onChange={(event) => setForm({ ...form, relatedPublicationIds: event.target.checked ? [...(form.relatedPublicationIds || []), publication.id] : (form.relatedPublicationIds || []).filter((id: string) => id !== publication.id) })} /><span>{publication.title}</span></label>;
                      })}
                    </div>
                  </fieldset>
                )}
              </>
            )}

            {kind === 'articles' && (
              <>
                <EditorField label="Yazar" value={form.authorName || ''} onChange={(authorName) => setForm({ ...form, authorName })} />
                <EditorField label="Konu kümesi" value={form.topicCluster || ''} onChange={(topicCluster) => setForm({ ...form, topicCluster })} />
                <EditorField label="İlişkili sorgular (virgülle)" value={listInputs.relatedKeywords} onChange={(relatedKeywords) => setListInputs({ ...listInputs, relatedKeywords })} wide />
                <EditorArea label="Kaynaklar (satır başına bir URL/kaynak)" value={listInputs.references} onChange={(references) => setListInputs({ ...listInputs, references })} rows={5} />
              </>
            )}
          </div>
          {Object.keys(validationErrors).length > 0 && (
            <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              <p className="font-black">Kaydedilemeyen alanlar</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {Object.entries(validationErrors).flatMap(([field, messages]) =>
                  messages.map((message) => (
                    <li key={`${field}-${message}`}>{firstValidationMessage({ [field]: [message] }, message)}</li>
                  ))
                )}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {editingId !== 'new' && (
              <button type="button" onClick={preview} className="seo-secondary-button">
                <FileText className="h-4 w-4" /> Önizle
              </button>
            )}
            <button type="button" onClick={cancel} className="seo-secondary-button">İptal</button>
            <button type="button" onClick={save} disabled={busy} className="seo-primary-button">
              <Save className="h-4 w-4" /> {busy ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
          {(currentStatus === 'published' || currentStatus === 'scheduled') && readiness.score < 100 && (
            <p className="rounded-xl border border-amber-300 bg-amber-100 p-3 text-xs font-semibold text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              Yayınlamadan önce hazırlık kontrolündeki eksikleri tamamlayın. Sunucu, zorunlu SEO ve erişilebilirlik alanları eksikse yayını engeller.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800/40 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">İçeriklerde ara</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Başlık, URL veya konu içinde ara…" className="editor-input h-11 pl-9" />
        </label>
        <label className="sm:w-48">
          <span className="sr-only">Duruma göre filtrele</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ContentStatus | 'all')} className="editor-input h-11">
            <option value="all">Tüm durumlar</option>
            {kind !== 'articles' && <option value="none">Yalnız kısa kayıt</option>}
            <option value="draft">Taslak</option>
            <option value="scheduled">Zamanlanmış</option>
            <option value="published">Yayınlandı</option>
          </select>
        </label>
      </div>

      <div className="space-y-3">
        {orderedItems.map((item) => {
          const state = statusOf(kind, item as Record<string, any>);
          const slug = item.slug || slugifyTurkish(item.title);
          const itemReadiness = contentReadiness({
            ...item,
            slug,
            ...(kind === 'articles'
              ? { status: state }
              : { detailStatus: state }),
          });
          const live = isContentPublished(state, item.publishedAt);
          return (
            <article key={item.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="min-w-0 break-words text-sm font-bold">{item.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${live ? 'bg-emerald-100 text-emerald-800' : state === 'scheduled' ? 'bg-sky-100 text-sky-800' : 'bg-stone-200 text-stone-700'}`}>{live && state === 'scheduled' ? 'yayında' : statusLabel(state)}</span>
                  {item.isFeatured && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800"><Sparkles className="h-3 w-3" /> öne çıkan</span>}
                </div>
                <p className="mt-1 break-all font-mono text-[11px] text-stone-500">/{archivePrefix}/{slug}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-500">
                  <span>Hazırlık: <strong className={itemReadiness.score === 100 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}>%{itemReadiness.score}</strong></span>
                  <span>Sıra: {item.sortOrder || 0}</span>
                  {item.updatedAt && <span>Güncelleme: {new Intl.DateTimeFormat('tr-TR').format(new Date(item.updatedAt))}</span>}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                {live && <a href={`/${archivePrefix}/${slug}`} target="_blank" rel="noopener noreferrer" aria-label={`${item.title} canlı sayfasını aç`} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"><ExternalLink className="h-4 w-4" /></a>}
                <button type="button" onClick={() => duplicate(item)} disabled={busy || Boolean(editingId)} aria-label={`${item.title} kaydını çoğalt`} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-40 dark:text-stone-300 dark:hover:bg-stone-800"><Copy className="h-4 w-4" /></button>
                <button type="button" onClick={() => startEdit(item)} disabled={busy || Boolean(editingId)} aria-label={`${item.title} kaydını düzenle`} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-40 dark:text-stone-300 dark:hover:bg-stone-800"><Edit3 className="h-4 w-4" /></button>
                <button type="button" onClick={() => remove(item)} disabled={busy} aria-label={`${item.title} kaydını sil`} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-100 disabled:opacity-40 dark:hover:bg-rose-950"><Trash2 className="h-4 w-4" /></button>
              </div>
            </article>
          );
        })}
        {!orderedItems.length && <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500 dark:border-stone-700">{items.length ? 'Arama veya filtreyle eşleşen kayıt yok.' : 'Henüz kayıt yok.'}</p>}
      </div>
    </section>
  );
}

function statusLabel(status: ContentStatus): string {
  if (status === 'published') return 'yayınlandı';
  if (status === 'scheduled') return 'zamanlanmış';
  if (status === 'draft') return 'taslak';
  return 'kısa kayıt';
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'stone',
}: {
  label: string;
  value: number;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: 'stone' | 'emerald' | 'amber';
}) {
  const tones = {
    stone: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
    emerald: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300',
  };
  return (
    <div className={`rounded-2xl border border-stone-200 p-4 dark:border-stone-700 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-2xl font-black">{value}</span>
        {Icon && <Icon className="h-4 w-4 opacity-70" />}
      </div>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-wider opacity-80">{label}</p>
    </div>
  );
}

function EditorField({
  label,
  value,
  onChange,
  wide = false,
  type = 'text',
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  wide?: boolean;
  type?: React.HTMLInputTypeAttribute;
  hint?: string;
}) {
  return <label className={`block ${wide ? 'md:col-span-2' : ''}`}><span className="editor-label">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="editor-input" />{hint && <span className="mt-1.5 block text-[11px] leading-4 text-stone-500">{hint}</span>}</label>;
}

function EditorArea({ label, value, onChange, rows }: { label: string; value: string; onChange: (value: string) => void; rows: number }) {
  return <label className="block md:col-span-2"><span className="editor-label">{label}</span><textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} className="editor-input resize-y" /></label>;
}

function EditorCheckbox({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-[4.5rem] items-start gap-3 rounded-xl border border-stone-200 bg-white p-3.5 dark:border-stone-700 dark:bg-stone-900">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-amber-600" />
      <span>
        <span className="block text-xs font-bold text-stone-800 dark:text-stone-100">{label}</span>
        <span className="mt-1 block text-[11px] leading-4 text-stone-500">{description}</span>
      </span>
    </label>
  );
}
