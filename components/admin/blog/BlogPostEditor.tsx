'use client';

import type { JSONContent } from '@tiptap/core';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileClock,
  History,
  ImagePlus,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  SearchCheck,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { blogSlug } from '@/lib/blog/slug';
import {
  BlogRichTextEditor,
  type RichEditorValue,
} from './BlogRichTextEditor';

interface TaxonomyItem {
  id: string;
  slug: string;
  name?: string;
  title?: string;
  is_active: boolean;
}

interface SourceForm {
  id?: string;
  citationKey: string;
  title: string;
  authors: string[];
  publisher: string;
  publicationYear: number | null;
  url: string;
  doi: string;
  accessedAt: string;
  sortOrder: number;
}

interface Revision {
  id: string;
  revision_number: number;
  change_summary: string;
  created_at: string;
}

interface PostForm {
  title: string;
  slug: string;
  subtitle: string;
  excerpt: string;
  contentJson: Record<string, unknown>;
  contentHtml: string;
  contentText: string;
  words: number;
  characters: number;
  status: 'draft' | 'review' | 'scheduled' | 'published' | 'archived';
  authorName: string;
  categoryId: string;
  seriesId: string;
  seriesOrder: number | null;
  coverAssetId: string;
  coverImageUrl: string;
  coverImageAlt: string;
  canonicalUrl: string;
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  relatedKeywords: string;
  tagIds: string[];
  sources: SourceForm[];
  isFeatured: boolean;
  isPinned: boolean;
  sortOrder: number;
  allowIndexing: boolean;
  publishedAt: string;
  scheduledFor: string;
  changeSummary: string;
}

const emptyContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

const emptyForm: PostForm = {
  title: '',
  slug: '',
  subtitle: '',
  excerpt: '',
  contentJson: emptyContent,
  contentHtml: '<p></p>',
  contentText: '',
  words: 0,
  characters: 0,
  status: 'draft',
  authorName: 'Muhammed Akan',
  categoryId: '',
  seriesId: '',
  seriesOrder: null,
  coverAssetId: '',
  coverImageUrl: '',
  coverImageAlt: '',
  canonicalUrl: '',
  seoTitle: '',
  seoDescription: '',
  focusKeyword: '',
  relatedKeywords: '',
  tagIds: [],
  sources: [],
  isFeatured: false,
  isPinned: false,
  sortOrder: 0,
  allowIndexing: true,
  publishedAt: '',
  scheduledFor: '',
  changeSummary: '',
};

function localDateTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function apiDateTime(value: string) {
  return value ? new Date(value).toISOString() : '';
}

function sourceFromRow(row: Record<string, unknown>, index: number): SourceForm {
  return {
    id: typeof row.id === 'string' ? row.id : undefined,
    citationKey:
      typeof row.citation_key === 'string'
        ? row.citation_key
        : `kaynak-${index + 1}`,
    title: typeof row.title === 'string' ? row.title : '',
    authors: Array.isArray(row.authors)
      ? row.authors.filter((item): item is string => typeof item === 'string')
      : [],
    publisher: typeof row.publisher === 'string' ? row.publisher : '',
    publicationYear:
      typeof row.publication_year === 'number' ? row.publication_year : null,
    url: typeof row.url === 'string' ? row.url : '',
    doi: typeof row.doi === 'string' ? row.doi : '',
    accessedAt: typeof row.accessed_at === 'string' ? row.accessed_at : '',
    sortOrder: index,
  };
}

function inputClass() {
  return 'w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-stone-700 dark:bg-stone-950';
}

export function BlogPostEditor({ postId }: { postId?: string }) {
  const router = useRouter();
  const coverInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<PostForm>(emptyForm);
  const [categories, setCategories] = useState<TaxonomyItem[]>([]);
  const [tags, setTags] = useState<TaxonomyItem[]>([]);
  const [series, setSeries] = useState<TaxonomyItem[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [slugTouched, setSlugTouched] = useState(Boolean(postId));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const requests: Promise<Response>[] = [
          fetch('/api/blog/admin/taxonomy'),
        ];
        if (postId) requests.push(fetch(`/api/blog/admin/posts/${postId}`));
        const responses = await Promise.all(requests);
        const taxonomyPayload = await responses[0].json();
        if (!responses[0].ok || !taxonomyPayload.success) {
          throw new Error(
            taxonomyPayload?.error?.message || 'Kategoriler yüklenemedi.'
          );
        }
        if (cancelled) return;
        setCategories(taxonomyPayload.data.categories);
        setTags(taxonomyPayload.data.tags);
        setSeries(taxonomyPayload.data.series);

        if (postId && responses[1]) {
          const payload = await responses[1].json();
          if (!responses[1].ok || !payload.success) {
            throw new Error(payload?.error?.message || 'Yazı yüklenemedi.');
          }
          const post = payload.data.post;
          setForm({
            title: post.title || '',
            slug: post.slug || '',
            subtitle: post.subtitle || '',
            excerpt: post.excerpt || '',
            contentJson: post.content_json || emptyContent,
            contentHtml: post.content_html || '<p></p>',
            contentText: post.content_text || '',
            words: Number(post.word_count) || 0,
            characters: (post.content_text || '').length,
            status: post.status || 'draft',
            authorName: post.author_name || 'Muhammed Akan',
            categoryId: post.category_id || '',
            seriesId: post.series_id || '',
            seriesOrder: post.series_order ?? null,
            coverAssetId: post.cover_asset_id || '',
            coverImageUrl:
              post.cover_asset?.object_path && post.cover_asset?.bucket_id
                ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${post.cover_asset.bucket_id}/${post.cover_asset.object_path}`
                : post.cover_image_url || '',
            coverImageAlt: post.cover_image_alt || '',
            canonicalUrl: post.canonical_url || '',
            seoTitle: post.seo_title || '',
            seoDescription: post.seo_description || '',
            focusKeyword: post.focus_keyword || '',
            relatedKeywords: (post.related_keywords || []).join(', '),
            tagIds: payload.data.tagIds || [],
            sources: (payload.data.sources || []).map(sourceFromRow),
            isFeatured: Boolean(post.is_featured),
            isPinned: Boolean(post.is_pinned),
            sortOrder: Number(post.sort_order) || 0,
            allowIndexing: post.allow_indexing !== false,
            publishedAt: localDateTime(post.published_at),
            scheduledFor: localDateTime(post.scheduled_for),
            changeSummary: '',
          });
          setRevisions(payload.data.revisions || []);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Editör yüklenemedi.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  function update<K extends keyof PostForm>(key: K, value: PostForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setMessage('');
  }

  function updateTitle(title: string) {
    setForm((current) => ({
      ...current,
      title,
      slug: !slugTouched ? blogSlug(title) : current.slug,
    }));
    setDirty(true);
  }

  function updateContent(value: RichEditorValue) {
    setForm((current) => ({
      ...current,
      contentJson: value.json,
      contentHtml: value.html,
      contentText: value.text,
      words: value.words,
      characters: value.characters,
    }));
    setDirty(true);
    try {
      window.localStorage.setItem(
        `blog-editor-backup:${postId || 'new'}`,
        JSON.stringify({ savedAt: new Date().toISOString(), ...value })
      );
    } catch {
      // The database remains the source of truth when local storage is blocked.
    }
  }

  async function uploadCover(file?: File) {
    if (!file) return;
    const alt =
      form.coverImageAlt.trim() ||
      window.prompt('Kapak görseli alternatif metni', form.title)?.trim();
    if (!alt) return;
    setUploadingCover(true);
    setError('');
    try {
      const body = new FormData();
      body.set('file', file);
      body.set('purpose', 'blog');
      body.set('altText', alt);
      const response = await fetch('/api/upload', { method: 'POST', body });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error || 'Kapak görseli yüklenemedi.');
      }
      setForm((current) => ({
        ...current,
        coverAssetId: payload.asset.id,
        coverImageUrl: payload.asset.url,
        coverImageAlt: alt,
      }));
      setDirty(true);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Kapak görseli yüklenemedi.'
      );
    } finally {
      setUploadingCover(false);
      if (coverInput.current) coverInput.current.value = '';
    }
  }

  async function save(overrideStatus?: PostForm['status']) {
    const status = overrideStatus || form.status;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(
        postId ? `/api/blog/admin/posts/${postId}` : '/api/blog/admin/posts',
        {
          method: postId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: postId || undefined,
            locale: 'tr',
            title: form.title,
            slug: form.slug,
            subtitle: form.subtitle,
            excerpt: form.excerpt,
            contentJson: form.contentJson,
            contentHtml: form.contentHtml,
            status,
            authorName: form.authorName,
            categoryId: form.categoryId,
            seriesId: form.seriesId,
            seriesOrder: form.seriesOrder,
            coverAssetId: form.coverAssetId,
            coverImageUrl: form.coverImageUrl,
            coverImageAlt: form.coverImageAlt,
            canonicalUrl: form.canonicalUrl,
            seoTitle: form.seoTitle,
            seoDescription: form.seoDescription,
            focusKeyword: form.focusKeyword,
            relatedKeywords: form.relatedKeywords
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean),
            tagIds: form.tagIds,
            sources: form.sources,
            isFeatured: form.isFeatured,
            isPinned: form.isPinned,
            sortOrder: form.sortOrder,
            allowIndexing: form.allowIndexing,
            publishedAt: apiDateTime(form.publishedAt),
            scheduledFor: apiDateTime(form.scheduledFor),
            changeSummary:
              form.changeSummary ||
              (overrideStatus ? `Durum ${overrideStatus} olarak değiştirildi` : ''),
          }),
        }
      );
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || 'Yazı kaydedilemedi.');
      }
      setDirty(false);
      setMessage(
        status === 'published'
          ? 'Yazı yayınlandı ve önbellek yenilendi.'
          : 'Değişiklikler güvenle kaydedildi.'
      );
      setForm((current) => ({ ...current, status, changeSummary: '' }));
      window.localStorage.removeItem(`blog-editor-backup:${postId || 'new'}`);
      if (!postId) {
        router.replace(`/admin/blog/yazilar/${payload.data.id}`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Yazı kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  function addSource() {
    update('sources', [
      ...form.sources,
      {
        citationKey: `kaynak-${form.sources.length + 1}`,
        title: '',
        authors: [],
        publisher: '',
        publicationYear: null,
        url: '',
        doi: '',
        accessedAt: '',
        sortOrder: form.sources.length,
      },
    ]);
  }

  function updateSource(index: number, patch: Partial<SourceForm>) {
    update(
      'sources',
      form.sources.map((source, sourceIndex) =>
        sourceIndex === index ? { ...source, ...patch } : source
      )
    );
  }

  async function restoreRevision(revision: Revision) {
    if (
      !window.confirm(
        `${revision.revision_number}. sürüm geri yüklensin mi? Mevcut durum ayrıca sürüm olarak korunacak.`
      )
    ) {
      return;
    }
    const response = await fetch(`/api/blog/admin/posts/${postId}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revisionId: revision.id }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message || 'Sürüm geri yüklenemedi.');
      return;
    }
    window.location.reload();
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (error && !form.title && postId) {
    return <p className="rounded-2xl border border-red-200 bg-red-50 p-5 font-bold text-red-800">{error}</p>;
  }

  const seoChecks = [
    { label: 'SEO başlığı 35–60 karakter', ok: (form.seoTitle || form.title).length >= 35 && (form.seoTitle || form.title).length <= 60 },
    { label: 'Açıklama 120–160 karakter', ok: form.seoDescription.length >= 120 && form.seoDescription.length <= 160 },
    { label: 'Odak kelime başlıkta', ok: Boolean(form.focusKeyword && form.title.toLocaleLowerCase('tr').includes(form.focusKeyword.toLocaleLowerCase('tr'))) },
    { label: 'Kapak alternatif metni var', ok: !form.coverImageUrl || Boolean(form.coverImageAlt) },
    { label: 'En az 300 kelime', ok: form.words >= 300 },
  ];

  return (
    <main className="mx-auto max-w-[96rem]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/blog/yazilar" className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-900" aria-label="Yazılara dön"><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">{postId ? 'Yazıyı düzenle' : 'Yeni içerik'}</p>
            <h1 className="mt-1 text-xl font-black sm:text-2xl">{form.title || 'Başlıksız yazı'}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dirty ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400"><Clock3 className="h-3.5 w-3.5" /> Kaydedilmemiş değişiklik</span> : null}
          {postId ? <Link href={form.status === 'published' ? `/blog/${form.slug}` : `/admin/blog/yazilar/${postId}/onizleme`} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-xl border border-stone-300 bg-white px-3 text-xs font-black dark:border-stone-700 dark:bg-stone-900">Önizle <ExternalLink className="h-3.5 w-3.5" /></Link> : null}
          <button type="button" disabled={saving} onClick={() => void save()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-stone-950 px-4 text-xs font-black text-white disabled:opacity-50 dark:bg-amber-500 dark:text-stone-950">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Kaydet</button>
        </div>
      </div>

      {message ? <p className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800"><CheckCircle2 className="h-4 w-4" /> {message}</p> : null}
      {error ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p> : null}

      <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-6">
            <label className="block">
              <span className="editor-label">Başlık</span>
              <input value={form.title} onChange={(event) => updateTitle(event.target.value)} className="w-full border-0 bg-transparent text-3xl font-black tracking-tight outline-none placeholder:text-stone-300 dark:placeholder:text-stone-700 sm:text-4xl" placeholder="Okurun merakını doğru biçimde karşılayan başlık" />
            </label>
            <label className="mt-4 block">
              <span className="editor-label">Alt başlık</span>
              <input value={form.subtitle} onChange={(event) => update('subtitle', event.target.value)} className={inputClass()} placeholder="Başlığın vaadini netleştiren kısa cümle" />
            </label>
            <label className="mt-4 block">
              <span className="editor-label">Özet · {form.excerpt.length}/640</span>
              <textarea value={form.excerpt} onChange={(event) => update('excerpt', event.target.value)} rows={3} maxLength={640} className={inputClass()} placeholder="Arşiv kartlarında ve arama sonuçlarında kullanılacak özgün özet" />
            </label>
          </section>

          <BlogRichTextEditor
            initialContent={form.contentJson as JSONContent}
            onChange={updateContent}
          />

          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-black">Kaynakça</h2>
                <p className="mt-1 text-xs text-stone-500">DOI, URL, yazar ve erişim tarihi yapılandırılmış veriye de aktarılır.</p>
              </div>
              <button type="button" onClick={addSource} className="inline-flex h-10 items-center gap-2 rounded-xl border border-stone-300 px-3 text-xs font-black dark:border-stone-700"><Plus className="h-4 w-4" /> Kaynak ekle</button>
            </div>
            <div className="mt-5 space-y-4">
              {form.sources.map((source, index) => (
                <div key={`${source.id || 'new'}-${index}`} className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-950">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-stone-500">Kaynak {index + 1}</p>
                    <button type="button" onClick={() => update('sources', form.sources.filter((_, itemIndex) => itemIndex !== index))} className="text-red-600" aria-label="Kaynağı kaldır"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="sm:col-span-2"><span className="editor-label">Başlık</span><input value={source.title} onChange={(event) => updateSource(index, { title: event.target.value })} className={inputClass()} /></label>
                    <label><span className="editor-label">Yazarlar · virgülle</span><input value={source.authors.join(', ')} onChange={(event) => updateSource(index, { authors: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} className={inputClass()} /></label>
                    <label><span className="editor-label">Yayıncı</span><input value={source.publisher} onChange={(event) => updateSource(index, { publisher: event.target.value })} className={inputClass()} /></label>
                    <label><span className="editor-label">URL</span><input type="url" value={source.url} onChange={(event) => updateSource(index, { url: event.target.value })} className={inputClass()} placeholder="https://" /></label>
                    <label><span className="editor-label">DOI</span><input value={source.doi} onChange={(event) => updateSource(index, { doi: event.target.value })} className={inputClass()} placeholder="10.xxxx/…" /></label>
                    <label><span className="editor-label">Yayın yılı</span><input type="number" min={1000} max={3000} value={source.publicationYear ?? ''} onChange={(event) => updateSource(index, { publicationYear: event.target.value ? Number(event.target.value) : null })} className={inputClass()} /></label>
                    <label><span className="editor-label">Erişim tarihi</span><input type="date" value={source.accessedAt} onChange={(event) => updateSource(index, { accessedAt: event.target.value })} className={inputClass()} /></label>
                  </div>
                </div>
              ))}
              {!form.sources.length ? <p className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500 dark:border-stone-700">Henüz kaynak eklenmedi.</p> : null}
            </div>
          </section>

          {postId ? (
            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-6">
              <div className="flex items-center gap-2"><History className="h-5 w-5 text-amber-600" /><h2 className="font-black">Sürüm geçmişi</h2></div>
              <div className="mt-4 space-y-2">
                {revisions.map((revision) => (
                  <div key={revision.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 p-3 dark:border-stone-700">
                    <div><p className="text-sm font-bold">Sürüm {revision.revision_number}</p><p className="mt-1 text-[11px] text-stone-500">{revision.change_summary || 'Otomatik sürüm'} · {new Date(revision.created_at).toLocaleString('tr-TR')}</p></div>
                    <button type="button" onClick={() => void restoreRevision(revision)} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-2 text-[11px] font-black dark:border-stone-700"><RotateCcw className="h-3.5 w-3.5" /> Geri yükle</button>
                  </div>
                ))}
                {!revisions.length ? <p className="text-sm text-stone-500">İlk güncellemeden sonra sürümler burada görünür.</p> : null}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="min-w-0 space-y-5 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <h2 className="font-black">Yayın</h2>
            <div className="mt-4 space-y-4">
              <label><span className="editor-label">Durum</span><select value={form.status} onChange={(event) => update('status', event.target.value as PostForm['status'])} className={inputClass()}><option value="draft">Taslak</option><option value="review">İncelemede</option><option value="scheduled">Zamanlandı</option><option value="published">Yayında</option><option value="archived">Arşivlendi</option></select></label>
              {form.status === 'scheduled' ? <label><span className="editor-label">Yayın zamanı</span><input type="datetime-local" value={form.scheduledFor} onChange={(event) => update('scheduledFor', event.target.value)} className={inputClass()} /></label> : null}
              <label><span className="editor-label">Yazar adı</span><input value={form.authorName} onChange={(event) => update('authorName', event.target.value)} className={inputClass()} /></label>
              <label><span className="editor-label">Kategori</span><select value={form.categoryId} onChange={(event) => update('categoryId', event.target.value)} className={inputClass()}><option value="">Kategori yok</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label><span className="editor-label">Seri</span><select value={form.seriesId} onChange={(event) => update('seriesId', event.target.value)} className={inputClass()}><option value="">Seri yok</option>{series.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
              {form.seriesId ? <label><span className="editor-label">Seri sırası</span><input type="number" min={1} value={form.seriesOrder ?? ''} onChange={(event) => update('seriesOrder', event.target.value ? Number(event.target.value) : null)} className={inputClass()} /></label> : null}
              <label><span className="editor-label">Değişiklik notu</span><input value={form.changeSummary} onChange={(event) => update('changeSummary', event.target.value)} className={inputClass()} placeholder="Bu sürümde ne değişti?" /></label>
              <div className="space-y-2 text-xs font-bold"><label className="flex items-center gap-2"><input type="checkbox" checked={form.isFeatured} onChange={(event) => update('isFeatured', event.target.checked)} /> Öne çıkar</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.isPinned} onChange={(event) => update('isPinned', event.target.checked)} /> Arşivde sabitle</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.allowIndexing} onChange={(event) => update('allowIndexing', event.target.checked)} /> Arama motorları indeksleyebilir</label></div>
              <div className="grid grid-cols-2 gap-2"><button type="button" disabled={saving} onClick={() => void save('draft')} className="h-10 rounded-xl border border-stone-300 text-xs font-black dark:border-stone-700">Taslak kaydet</button><button type="button" disabled={saving} onClick={() => void save('published')} className="h-10 rounded-xl bg-emerald-600 text-xs font-black text-white">Yayınla</button></div>
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between"><h2 className="font-black">Kapak görseli</h2><ImagePlus className="h-4 w-4 text-amber-600" /></div>
            {form.coverImageUrl ? <div className="relative mt-4 aspect-video overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800"><Image src={form.coverImageUrl} alt={form.coverImageAlt || form.title} fill sizes="352px" className="object-cover" /></div> : <button type="button" onClick={() => coverInput.current?.click()} className="mt-4 flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-stone-300 text-xs font-bold text-stone-500 dark:border-stone-700">Görsel yükle</button>}
            <input ref={coverInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" className="hidden" onChange={(event) => void uploadCover(event.target.files?.[0])} />
            <button type="button" disabled={uploadingCover} onClick={() => coverInput.current?.click()} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-stone-300 text-xs font-black dark:border-stone-700">{uploadingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} {form.coverImageUrl ? 'Görseli değiştir' : 'Kapak yükle'}</button>
            <label className="mt-3 block"><span className="editor-label">Alternatif metin</span><textarea value={form.coverImageAlt} onChange={(event) => update('coverImageAlt', event.target.value)} rows={2} className={inputClass()} /></label>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <h2 className="font-black">Etiketler</h2>
            <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
              {tags.map((tag) => <label key={tag.id} className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={form.tagIds.includes(tag.id)} onChange={(event) => update('tagIds', event.target.checked ? [...form.tagIds, tag.id] : form.tagIds.filter((id) => id !== tag.id))} /> {tag.name}</label>)}
              {!tags.length ? <p className="text-xs text-stone-500">Taksonomi bölümünden etiket ekleyin.</p> : null}
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center gap-2"><SearchCheck className="h-5 w-5 text-amber-600" /><h2 className="font-black">SEO ve keşfedilebilirlik</h2></div>
            <div className="mt-4 space-y-3">
              <label><span className="editor-label">URL kısa adı</span><input value={form.slug} onChange={(event) => { setSlugTouched(true); update('slug', blogSlug(event.target.value)); }} className={inputClass()} /></label>
              <label><span className="editor-label">SEO başlığı · {form.seoTitle.length}/120</span><input value={form.seoTitle} onChange={(event) => update('seoTitle', event.target.value)} className={inputClass()} placeholder={form.title} /></label>
              <label><span className="editor-label">Meta açıklama · {form.seoDescription.length}/320</span><textarea value={form.seoDescription} onChange={(event) => update('seoDescription', event.target.value)} rows={3} className={inputClass()} /></label>
              <label><span className="editor-label">Odak anahtar kelime</span><input value={form.focusKeyword} onChange={(event) => update('focusKeyword', event.target.value)} className={inputClass()} /></label>
              <label><span className="editor-label">İlgili kelimeler · virgülle</span><input value={form.relatedKeywords} onChange={(event) => update('relatedKeywords', event.target.value)} className={inputClass()} /></label>
              <label><span className="editor-label">Kanonik URL · isteğe bağlı</span><input type="url" value={form.canonicalUrl} onChange={(event) => update('canonicalUrl', event.target.value)} className={inputClass()} placeholder="https://" /></label>
            </div>
            <div className="mt-4 space-y-2 border-t border-stone-200 pt-4 dark:border-stone-800">
              {seoChecks.map((check) => <p key={check.label} className={`flex items-center gap-2 text-[11px] font-bold ${check.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-500'}`}>{check.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <FileClock className="h-3.5 w-3.5" />}{check.label}</p>)}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
