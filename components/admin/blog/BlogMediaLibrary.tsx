'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  FileText,
  ImageIcon,
  Loader2,
  RotateCcw,
  Save,
  Trash2,
  UploadCloud,
} from 'lucide-react';

interface Asset {
  id: string;
  original_name: string;
  mime_type: string;
  byte_size: number;
  alt_text: string;
  caption: string;
  credit: string;
  focal_x: number;
  focal_y: number;
  created_at: string;
  deleted_at?: string | null;
  public_url: string;
}

function fieldClass() {
  return 'w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-amber-500 dark:border-stone-700 dark:bg-stone-950';
}

function fileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function BlogMediaLibrary() {
  const input = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async (showDeleted: boolean) => {
    try {
      const response = await fetch(
        `/api/blog/admin/assets${showDeleted ? '?deleted=true' : ''}`
      );
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || 'Medya yüklenemedi.');
      }
      setAssets(payload.data.assets);
      setSelected((current) =>
        current
          ? payload.data.assets.find((asset: Asset) => asset.id === current.id) ||
            null
          : null
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Medya yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(includeDeleted), 0);
    return () => window.clearTimeout(timer);
  }, [includeDeleted, load]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError('');
    try {
      for (const file of Array.from(files).slice(0, 10)) {
        const body = new FormData();
        body.set('file', file);
        body.set('purpose', 'blog');
        body.set('altText', file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
        const response = await fetch('/api/upload', { method: 'POST', body });
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(`${file.name}: ${payload?.error || 'Yüklenemedi.'}`);
        }
      }
      await load(includeDeleted);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Dosyalar yüklenemedi.');
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  }

  async function saveSelected(restore = false) {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/blog/admin/assets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selected.id,
          altText: selected.alt_text,
          caption: selected.caption,
          credit: selected.credit,
          focalX: Number(selected.focal_x),
          focalY: Number(selected.focal_y),
          restore,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || 'Medya bilgileri kaydedilemedi.');
      }
      await load(includeDeleted);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Medya bilgileri kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  async function softDelete(asset: Asset) {
    if (!window.confirm(`“${asset.original_name}” medya kütüphanesinden kaldırılsın mı? Geri yüklenebilir.`)) return;
    const response = await fetch(`/api/blog/admin/assets?id=${asset.id}`, {
      method: 'DELETE',
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message || 'Medya kaldırılamadı.');
      return;
    }
    setSelected(null);
    await load(includeDeleted);
  }

  async function copyUrl(asset: Asset) {
    await navigator.clipboard.writeText(asset.public_url);
    setCopied(asset.id);
    window.setTimeout(() => setCopied(''), 1500);
  }

  return (
    <main className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div><p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">Kalıcı dosya deposu</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Medya kütüphanesi</h1><p className="mt-2 text-sm text-stone-600 dark:text-stone-300">Görseller, GIF ve PDF dosyaları · 15 MB sınırı · erişilebilirlik metinleri.</p></div>
        <div className="flex gap-2"><label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={includeDeleted} onChange={(event) => setIncludeDeleted(event.target.checked)} /> Kaldırılanları göster</label><button type="button" disabled={uploading} onClick={() => input.current?.click()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-stone-950 px-5 text-xs font-black text-white disabled:opacity-50 dark:bg-amber-500 dark:text-stone-950">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />} Dosya yükle</button><input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/gif,application/pdf" className="hidden" onChange={(event) => void upload(event.target.files)} /></div>
      </div>
      {error ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</p> : null}

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section>
          {loading ? <div className="flex min-h-80 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-amber-600" /></div> : assets.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{assets.map((asset) => <article key={asset.id} className={`group overflow-hidden rounded-2xl border bg-white shadow-sm transition dark:bg-stone-900 ${selected?.id === asset.id ? 'border-amber-500 ring-4 ring-amber-500/10' : 'border-stone-200 dark:border-stone-800'} ${asset.deleted_at ? 'opacity-55' : ''}`}><button type="button" onClick={() => setSelected(asset)} className="block w-full text-left"><div className="relative aspect-video overflow-hidden bg-stone-100 dark:bg-stone-800">{asset.mime_type.startsWith('image/') ? <Image src={asset.public_url} alt={asset.alt_text || asset.original_name} fill sizes="(max-width: 640px) 50vw, 280px" className="object-cover" /> : <div className="flex h-full items-center justify-center"><FileText className="h-10 w-10 text-red-600" /></div>}{asset.deleted_at ? <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-1 text-[10px] font-black text-white">Kaldırıldı</span> : null}</div><div className="p-3"><p className="truncate text-xs font-black">{asset.original_name}</p><p className="mt-1 text-[10px] text-stone-500">{fileSize(asset.byte_size)} · {new Date(asset.created_at).toLocaleDateString('tr-TR')}</p></div></button><div className="flex gap-1 border-t border-stone-100 p-2 dark:border-stone-800"><button type="button" onClick={() => void copyUrl(asset)} className="flex h-8 flex-1 items-center justify-center gap-1 rounded-lg text-[10px] font-black hover:bg-stone-100 dark:hover:bg-stone-800">{copied === asset.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />} URL</button>{!asset.deleted_at ? <button type="button" onClick={() => void softDelete(asset)} className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50" aria-label="Medyayı kaldır"><Trash2 className="h-3.5 w-3.5" /></button> : null}</div></article>)}</div> : <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-14 text-center dark:border-stone-700 dark:bg-stone-900"><ImageIcon className="mx-auto h-10 w-10 text-amber-600" /><h2 className="mt-4 text-xl font-black">Medya kütüphanesi boş</h2><p className="mt-2 text-sm text-stone-500">İlk kapak görselinizi veya teknik diyagramınızı yükleyin.</p></div>}
        </section>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          {selected ? <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"><h2 className="truncate font-black">{selected.original_name}</h2><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">{selected.mime_type} · {fileSize(selected.byte_size)}</p><div className="mt-4 space-y-4"><label><span className="editor-label">Alternatif metin</span><textarea value={selected.alt_text} onChange={(event) => setSelected({ ...selected, alt_text: event.target.value })} rows={3} className={fieldClass()} /></label><label><span className="editor-label">Açıklama</span><textarea value={selected.caption} onChange={(event) => setSelected({ ...selected, caption: event.target.value })} rows={3} className={fieldClass()} /></label><label><span className="editor-label">Kaynak / kredi</span><input value={selected.credit} onChange={(event) => setSelected({ ...selected, credit: event.target.value })} className={fieldClass()} /></label><div className="grid grid-cols-2 gap-3"><label><span className="editor-label">Odak X</span><input type="number" step="0.05" min={0} max={1} value={selected.focal_x} onChange={(event) => setSelected({ ...selected, focal_x: Number(event.target.value) })} className={fieldClass()} /></label><label><span className="editor-label">Odak Y</span><input type="number" step="0.05" min={0} max={1} value={selected.focal_y} onChange={(event) => setSelected({ ...selected, focal_y: Number(event.target.value) })} className={fieldClass()} /></label></div>{selected.deleted_at ? <button type="button" disabled={saving} onClick={() => void saveSelected(true)} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-xs font-black text-white"><RotateCcw className="h-4 w-4" /> Geri yükle</button> : <button type="button" disabled={saving} onClick={() => void saveSelected()} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-stone-950 text-xs font-black text-white dark:bg-amber-500 dark:text-stone-950">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Bilgileri kaydet</button>}</div></section> : <section className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-center dark:border-stone-700 dark:bg-stone-900"><ImageIcon className="mx-auto h-8 w-8 text-stone-300" /><p className="mt-3 text-xs font-bold text-stone-500">Bilgilerini düzenlemek için bir medya seçin.</p></section>}
        </aside>
      </div>
    </main>
  );
}
