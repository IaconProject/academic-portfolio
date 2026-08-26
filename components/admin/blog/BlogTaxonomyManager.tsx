'use client';

import { useCallback, useEffect, useState } from 'react';
import { Boxes, Loader2, Pencil, Plus, Save, Tags, Trash2 } from 'lucide-react';
import { blogSlug } from '@/lib/blog/slug';

type Kind = 'category' | 'tag' | 'series';

interface TaxonomyRow {
  id: string;
  slug: string;
  name?: string;
  title?: string;
  description: string;
  color?: string;
  icon?: string;
  seo_title?: string | null;
  seo_description?: string | null;
  sort_order?: number;
  is_active: boolean;
  cover_asset_id?: string | null;
}

interface TaxonomyForm {
  id?: string;
  slug: string;
  name: string;
  title: string;
  description: string;
  color: string;
  icon: string;
  seoTitle: string;
  seoDescription: string;
  sortOrder: number;
  isActive: boolean;
  coverAssetId: string;
}

const emptyForm: TaxonomyForm = {
  slug: '',
  name: '',
  title: '',
  description: '',
  color: 'amber',
  icon: 'folder',
  seoTitle: '',
  seoDescription: '',
  sortOrder: 0,
  isActive: true,
  coverAssetId: '',
};

const labels: Record<Kind, { singular: string; plural: string }> = {
  category: { singular: 'Kategori', plural: 'Kategoriler' },
  tag: { singular: 'Etiket', plural: 'Etiketler' },
  series: { singular: 'Seri', plural: 'Seriler' },
};

function fieldClass() {
  return 'w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-amber-500 dark:border-stone-700 dark:bg-stone-950';
}

export function BlogTaxonomyManager() {
  const [kind, setKind] = useState<Kind>('category');
  const [rows, setRows] = useState<Record<Kind, TaxonomyRow[]>>({
    category: [],
    tag: [],
    series: [],
  });
  const [form, setForm] = useState<TaxonomyForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/blog/admin/taxonomy');
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || 'Taksonomi yüklenemedi.');
      }
      setRows({
        category: payload.data.categories,
        tag: payload.data.tags,
        series: payload.data.series,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Taksonomi yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function edit(row: TaxonomyRow) {
    setForm({
      id: row.id,
      slug: row.slug,
      name: row.name || '',
      title: row.title || '',
      description: row.description || '',
      color: row.color || 'amber',
      icon: row.icon || 'folder',
      seoTitle: row.seo_title || '',
      seoDescription: row.seo_description || '',
      sortOrder: row.sort_order || 0,
      isActive: row.is_active !== false,
      coverAssetId: row.cover_asset_id || '',
    });
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function update<K extends keyof TaxonomyForm>(key: K, value: TaxonomyForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateName(value: string) {
    setForm((current) => ({
      ...current,
      ...(kind === 'series' ? { title: value } : { name: value }),
      ...(!current.id ? { slug: blogSlug(value) } : {}),
    }));
  }

  async function save() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const item =
        kind === 'category'
          ? {
              id: form.id,
              slug: form.slug,
              name: form.name,
              description: form.description,
              color: form.color,
              icon: form.icon,
              seoTitle: form.seoTitle,
              seoDescription: form.seoDescription,
              sortOrder: form.sortOrder,
              isActive: form.isActive,
            }
          : kind === 'tag'
            ? {
                id: form.id,
                slug: form.slug,
                name: form.name,
                description: form.description,
                isActive: form.isActive,
              }
            : {
                id: form.id,
                slug: form.slug,
                title: form.title,
                description: form.description,
                coverAssetId: form.coverAssetId,
                seoTitle: form.seoTitle,
                seoDescription: form.seoDescription,
                sortOrder: form.sortOrder,
                isActive: form.isActive,
              };
      const response = await fetch('/api/blog/admin/taxonomy', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, item }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || 'Kayıt tamamlanamadı.');
      }
      setMessage(`${labels[kind].singular} kaydedildi.`);
      setForm(emptyForm);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Kayıt tamamlanamadı.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: TaxonomyRow) {
    if (!window.confirm(`“${row.name || row.title}” silinsin mi? Yazılar silinmez; bağlantıları kaldırılır.`)) return;
    const response = await fetch(
      `/api/blog/admin/taxonomy?kind=${kind}&id=${row.id}`,
      { method: 'DELETE' }
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message || 'Silme işlemi tamamlanamadı.');
      return;
    }
    await load();
  }

  return (
    <main className="mx-auto max-w-6xl">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">Bilgi mimarisi</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Taksonomi yönetimi</h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">Kategoriler ana konu ağacını, etiketler kavramları, seriler öğrenme sırasını kurar.</p>
      </div>

      <div className="mt-7 flex flex-wrap gap-2">
        {(Object.keys(labels) as Kind[]).map((value) => (
          <button key={value} type="button" onClick={() => { setKind(value); setForm(emptyForm); }} className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-black ${kind === value ? 'bg-stone-950 text-white dark:bg-amber-500 dark:text-stone-950' : 'border border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-900'}`}>
            {value === 'tag' ? <Tags className="h-4 w-4" /> : <Boxes className="h-4 w-4" />} {labels[value].plural}
          </button>
        ))}
      </div>

      {message ? <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{message}</p> : null}
      {error ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</p> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-center justify-between"><h2 className="font-black">{form.id ? `${labels[kind].singular} düzenle` : `Yeni ${labels[kind].singular.toLocaleLowerCase('tr')}`}</h2>{form.id ? <button type="button" onClick={() => setForm(emptyForm)} className="text-xs font-black text-amber-700 dark:text-amber-400"><Plus className="inline h-3.5 w-3.5" /> Yeni</button> : null}</div>
          <div className="mt-4 space-y-4">
            <label><span className="editor-label">{kind === 'series' ? 'Seri başlığı' : 'Ad'}</span><input value={kind === 'series' ? form.title : form.name} onChange={(event) => updateName(event.target.value)} className={fieldClass()} /></label>
            <label><span className="editor-label">URL kısa adı</span><input value={form.slug} onChange={(event) => update('slug', blogSlug(event.target.value))} className={fieldClass()} /></label>
            <label><span className="editor-label">Açıklama</span><textarea value={form.description} onChange={(event) => update('description', event.target.value)} rows={4} className={fieldClass()} /></label>
            {kind === 'category' ? <div className="grid grid-cols-2 gap-3"><label><span className="editor-label">Renk</span><select value={form.color} onChange={(event) => update('color', event.target.value)} className={fieldClass()}><option value="amber">Amber</option><option value="cyan">Camgöbeği</option><option value="violet">Mor</option><option value="emerald">Yeşil</option></select></label><label><span className="editor-label">Simge</span><select value={form.icon} onChange={(event) => update('icon', event.target.value)} className={fieldClass()}><option value="folder">Klasör</option><option value="bitcoin">Bitcoin</option><option value="brain">Beyin</option><option value="cpu">İşlemci</option><option value="coins">Paralar</option></select></label></div> : null}
            {kind !== 'tag' ? <><label><span className="editor-label">SEO başlığı</span><input value={form.seoTitle} onChange={(event) => update('seoTitle', event.target.value)} className={fieldClass()} /></label><label><span className="editor-label">SEO açıklaması</span><textarea value={form.seoDescription} onChange={(event) => update('seoDescription', event.target.value)} rows={3} className={fieldClass()} /></label><label><span className="editor-label">Sıralama</span><input type="number" value={form.sortOrder} onChange={(event) => update('sortOrder', Number(event.target.value))} className={fieldClass()} /></label></> : null}
            <label className="flex items-center gap-2 text-xs font-black"><input type="checkbox" checked={form.isActive} onChange={(event) => update('isActive', event.target.checked)} /> Genel sitede etkin</label>
            <button type="button" disabled={saving} onClick={() => void save()} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-stone-950 text-xs font-black text-white disabled:opacity-50 dark:bg-amber-500 dark:text-stone-950">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Kaydet</button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <div className="border-b border-stone-200 px-5 py-4 dark:border-stone-800"><h2 className="font-black">{labels[kind].plural} · {rows[kind].length}</h2></div>
          {loading ? <p className="p-10 text-center text-sm font-bold text-stone-500">Yükleniyor…</p> : rows[kind].length ? <div className="divide-y divide-stone-100 dark:divide-stone-800">{rows[kind].map((row) => <article key={row.id} className="flex items-center justify-between gap-4 p-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-black">{row.name || row.title}</h3>{!row.is_active ? <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-black text-stone-500 dark:bg-stone-800">Kapalı</span> : null}</div><p className="mt-1 truncate text-xs text-stone-500">/blog/{kind === 'category' ? 'kategori' : kind === 'tag' ? 'etiket' : 'seri'}/{row.slug}</p></div><div className="flex gap-2"><button type="button" onClick={() => edit(row)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 dark:border-stone-700" aria-label="Düzenle"><Pencil className="h-3.5 w-3.5" /></button><button type="button" onClick={() => void remove(row)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700" aria-label="Sil"><Trash2 className="h-3.5 w-3.5" /></button></div></article>)}</div> : <p className="p-12 text-center text-sm text-stone-500">Henüz kayıt yok.</p>}
        </section>
      </div>
    </main>
  );
}
