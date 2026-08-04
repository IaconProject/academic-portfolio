'use client';

import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { BookOpen, Edit3, FileText, GitBranch, Plus, Save, Trash2, X } from 'lucide-react';
import type { ArticleItem, ContentStatus, ProjectItem, PublicationItem } from '@/lib/types';
import { slugifyTurkish } from '@/lib/seo';
import {
  firstValidationMessage,
  normalizeOptionalUrl,
} from '@/lib/admin-content-utils';

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

  const orderedItems = useMemo(
    () => [...items].sort((a, b) => String(b.updatedAt || b.publishedAt || '').localeCompare(String(a.updatedAt || a.publishedAt || ''))),
    [items]
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

  function cancel() {
    setEditingId(null);
    setForm(emptyItem(kind));
    setListInputs({ tags: '', relatedKeywords: '', references: '' });
    setValidationErrors({});
  }

  async function request(input: string, init: RequestInit) {
    const token = sessionStorage.getItem('admin_token') || '';
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

      {editingId && (
        <div className="min-w-0 space-y-5 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/20 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black">{editingId === 'new' ? `Yeni ${copy.singular}` : `${copy.singular} düzenle`}</h3>
            <button type="button" onClick={cancel} aria-label="Düzenleyiciyi kapat" className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/5"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <EditorField label="Başlık" value={form.title || ''} onChange={(title) => setForm({ ...form, title, slug: form.slug || slugifyTurkish(title) })} wide />
            <EditorField label="URL kısa adı" value={form.slug || ''} onChange={(slug) => setForm({ ...form, slug: slugifyTurkish(slug) })} />
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
            <EditorArea label="Özet" value={form.excerpt || ''} onChange={(excerpt) => setForm({ ...form, excerpt })} rows={4} />
            <EditorArea label="Zengin içerik (Markdown destekli)" value={form.content || ''} onChange={(content) => setForm({ ...form, content })} rows={10} />
            <EditorField label="Kapak görseli URL" value={form.coverImageUrl || ''} onChange={(coverImageUrl) => setForm({ ...form, coverImageUrl })} />
            <EditorField label="Kapak görseli alt metni" value={form.coverImageAlt || ''} onChange={(coverImageAlt) => setForm({ ...form, coverImageAlt })} />
            <EditorField label="Yayın tarihi (ISO)" value={form.publishedAt || ''} onChange={(publishedAt) => setForm({ ...form, publishedAt })} />

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
          <div className="flex justify-end gap-2">
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
          {(currentStatus === 'published' || currentStatus === 'scheduled') && (!form.excerpt || !form.content) && (
            <p className="rounded-xl border border-amber-300 bg-amber-100 p-3 text-xs font-semibold text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              Detay sayfası için özgün özet ve ana içerik gereklidir. Eksik zorunlu alanlar yayınlamayı engeller.
            </p>
          )}
        </div>
      )}

      <div className="space-y-3">
        {orderedItems.map((item) => {
          const state = statusOf(kind, item as Record<string, any>);
          return (
            <article key={item.id} className="flex flex-col justify-between gap-4 rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800/60 sm:flex-row sm:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-sm font-bold">{item.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${state === 'published' ? 'bg-emerald-100 text-emerald-800' : state === 'scheduled' ? 'bg-sky-100 text-sky-800' : 'bg-stone-200 text-stone-700'}`}>{state}</span>
                </div>
                <p className="mt-1 truncate font-mono text-[11px] text-stone-500">/{kind === 'articles' ? 'yazilar' : kind === 'publications' ? 'yayinlar' : 'projeler'}/{item.slug || slugifyTurkish(item.title)}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => startEdit(item)} disabled={busy || Boolean(editingId)} aria-label={`${item.title} kaydını düzenle`} className="rounded-lg p-2 text-stone-600 hover:bg-stone-200 disabled:opacity-40 dark:text-stone-300 dark:hover:bg-stone-700"><Edit3 className="h-4 w-4" /></button>
                <button type="button" onClick={() => remove(item)} disabled={busy} aria-label={`${item.title} kaydını sil`} className="rounded-lg p-2 text-rose-600 hover:bg-rose-100 disabled:opacity-40 dark:hover:bg-rose-950"><Trash2 className="h-4 w-4" /></button>
              </div>
            </article>
          );
        })}
        {!orderedItems.length && <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500 dark:border-stone-700">Henüz kayıt yok.</p>}
      </div>
    </section>
  );
}

function EditorField({ label, value, onChange, wide = false }: { label: string; value: string; onChange: (value: string) => void; wide?: boolean }) {
  return <label className={`block ${wide ? 'md:col-span-2' : ''}`}><span className="editor-label">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="editor-input" /></label>;
}

function EditorArea({ label, value, onChange, rows }: { label: string; value: string; onChange: (value: string) => void; rows: number }) {
  return <label className="block md:col-span-2"><span className="editor-label">{label}</span><textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} className="editor-input resize-y" /></label>;
}
