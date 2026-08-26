'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  ExternalLink,
  GripVertical,
  History,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';

type SectionType =
  | 'hero'
  | 'featured_posts'
  | 'latest_posts'
  | 'category_grid'
  | 'series_spotlight'
  | 'newsletter'
  | 'rich_text';

interface HomeSection {
  id?: string;
  sectionType: SectionType;
  internalName: string;
  heading: string;
  subheading: string;
  isEnabled: boolean;
  sortOrder: number;
  config: Record<string, unknown>;
}

interface HomeRevision {
  id: string;
  change_summary: string;
  created_at: string;
}

const sectionLabels: Record<SectionType, string> = {
  hero: 'Karşılama / Hero',
  featured_posts: 'Öne çıkan yazılar',
  latest_posts: 'Son yazılar',
  category_grid: 'Kategori ızgarası',
  series_spotlight: 'Seri vitrini',
  newsletter: 'Bülten çağrısı',
  rich_text: 'Serbest zengin metin',
};

const defaults: Record<SectionType, Omit<HomeSection, 'sectionType' | 'sortOrder'>> = {
  hero: {
    internalName: 'Ana karşılama',
    heading: 'Teknolojiyi ezberlemeden anlayın',
    subheading: 'Karmaşık sistemleri kaynaklarıyla, adım adım keşfedin.',
    isEnabled: true,
    config: { showSearch: true, showTopics: true },
  },
  featured_posts: {
    internalName: 'Editör seçkisi',
    heading: 'Öne çıkanlar',
    subheading: 'Okumaya başlamak için editörün seçtiği yazılar.',
    isEnabled: true,
    config: { limit: 3, layout: 'editorial' },
  },
  latest_posts: {
    internalName: 'Yeni yayınlananlar',
    heading: 'Yeni yayınlananlar',
    subheading: 'En güncel teknik açıklamalar ve araştırma notları.',
    isEnabled: true,
    config: { limit: 6 },
  },
  category_grid: {
    internalName: 'Konu haritası',
    heading: 'Konulara göre keşfet',
    subheading: 'İlgi alanınıza göre bir öğrenme yolu seçin.',
    isEnabled: true,
    config: { limit: 6 },
  },
  series_spotlight: {
    internalName: 'Seri vitrini',
    heading: 'Adım adım öğrenin',
    subheading: 'Seçili bir öğrenme serisini öne çıkarın.',
    isEnabled: true,
    config: {},
  },
  newsletter: {
    internalName: 'Bülten çağrısı',
    heading: 'Yeni yazıları kaçırmayın',
    subheading: 'Yeni teknik incelemeler yayınlandığında e-posta alın.',
    isEnabled: true,
    config: { variant: 'panel' },
  },
  rich_text: {
    internalName: 'Serbest içerik',
    heading: '',
    subheading: '',
    isEnabled: true,
    config: { html: '<p>Serbest metninizi buraya yazın.</p>' },
  },
};

function fieldClass() {
  return 'w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-amber-500 dark:border-stone-700 dark:bg-stone-950';
}

export function BlogHomeBuilder() {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [revisions, setRevisions] = useState<HomeRevision[]>([]);
  const [newType, setNewType] = useState<SectionType>('latest_posts');
  const [changeSummary, setChangeSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/blog/admin/home');
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || 'Ana sayfa yüklenemedi.');
      }
      setSections(
        payload.data.sections.map((section: Record<string, unknown>) => ({
          id: section.id as string,
          sectionType: section.section_type as SectionType,
          internalName: (section.internal_name as string) || '',
          heading: (section.heading as string) || '',
          subheading: (section.subheading as string) || '',
          isEnabled: section.is_enabled !== false,
          sortOrder: Number(section.sort_order) || 0,
          config:
            section.config && typeof section.config === 'object'
              ? (section.config as Record<string, unknown>)
              : {},
        }))
      );
      setRevisions(payload.data.revisions || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Ana sayfa yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function updateSection(index: number, patch: Partial<HomeSection>) {
    setSections((current) =>
      current.map((section, itemIndex) =>
        itemIndex === index ? { ...section, ...patch } : section
      )
    );
    setMessage('');
  }

  function updateConfig(index: number, key: string, value: unknown) {
    updateSection(index, {
      config: { ...sections[index].config, [key]: value },
    });
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    setSections((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addSection() {
    const source = defaults[newType];
    setSections((current) => [
      ...current,
      {
        sectionType: newType,
        ...source,
        config: { ...source.config },
        sortOrder: current.length * 10,
      },
    ]);
  }

  async function save() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/blog/admin/home', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections, changeSummary }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || 'Düzen kaydedilemedi.');
      }
      setMessage('Ana sayfa düzeni yayınlandı ve önbellek yenilendi.');
      setChangeSummary('');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Düzen kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  async function restore(revision: HomeRevision) {
    if (!window.confirm('Bu ana sayfa sürümü geri yüklensin mi? Mevcut düzen ayrıca korunacak.')) return;
    const response = await fetch('/api/blog/admin/home/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revisionId: revision.id }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message || 'Sürüm geri yüklenemedi.');
      return;
    }
    setMessage('Seçilen ana sayfa sürümü geri yüklendi.');
    await load();
  }

  if (loading && !sections.length) {
    return <div className="flex min-h-[55vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-600" /></div>;
  }

  return (
    <main className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">Görsel sayfa oluşturucu</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Blog ana sayfası</h1>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">Blokları sırala, çoğalt, kapat veya içeriğini değiştir.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/blog" target="_blank" className="inline-flex h-11 items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-xs font-black dark:border-stone-700 dark:bg-stone-900">Canlı önizleme <ExternalLink className="h-4 w-4" /></Link>
          <button type="button" disabled={saving} onClick={() => void save()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-stone-950 px-5 text-xs font-black text-white disabled:opacity-50 dark:bg-amber-500 dark:text-stone-950">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Düzeni yayınla</button>
        </div>
      </div>

      {message ? <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{message}</p> : null}
      {error ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</p> : null}

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4">
          {sections.map((section, index) => (
            <details key={section.id || `${section.sectionType}-${index}`} open className={`group rounded-2xl border bg-white shadow-sm dark:bg-stone-900 ${section.isEnabled ? 'border-stone-200 dark:border-stone-800' : 'border-dashed border-stone-300 opacity-70 dark:border-stone-700'}`}>
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                <GripVertical className="h-5 w-5 shrink-0 text-stone-300" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{section.internalName}</p><p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-stone-400">{sectionLabels[section.sectionType]}</p></div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-black ${section.isEnabled ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-stone-100 text-stone-500 dark:bg-stone-800'}`}>{section.isEnabled ? 'Yayında' : 'Kapalı'}</span>
                <div className="flex items-center gap-1" onClick={(event) => event.preventDefault()}>
                  <button type="button" disabled={index === 0} onClick={() => move(index, -1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 disabled:opacity-30 dark:border-stone-700" aria-label="Bloğu yukarı taşı"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button type="button" disabled={index === sections.length - 1} onClick={() => move(index, 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 disabled:opacity-30 dark:border-stone-700" aria-label="Bloğu aşağı taşı"><ArrowDown className="h-3.5 w-3.5" /></button>
                </div>
              </summary>
              <div className="border-t border-stone-200 p-4 dark:border-stone-800 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label><span className="editor-label">İç yönetim adı</span><input value={section.internalName} onChange={(event) => updateSection(index, { internalName: event.target.value })} className={fieldClass()} /></label>
                  <label><span className="editor-label">Blok türü</span><select value={section.sectionType} onChange={(event) => updateSection(index, { sectionType: event.target.value as SectionType })} className={fieldClass()}>{Object.entries(sectionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label className="sm:col-span-2"><span className="editor-label">Başlık</span><input value={section.heading} onChange={(event) => updateSection(index, { heading: event.target.value })} className={fieldClass()} /></label>
                  <label className="sm:col-span-2"><span className="editor-label">Alt açıklama</span><textarea value={section.subheading} onChange={(event) => updateSection(index, { subheading: event.target.value })} rows={2} className={fieldClass()} /></label>
                  {['featured_posts', 'latest_posts', 'category_grid'].includes(section.sectionType) ? <label><span className="editor-label">Gösterilecek öğe sayısı</span><input type="number" min={1} max={12} value={Number(section.config.limit) || 6} onChange={(event) => updateConfig(index, 'limit', Number(event.target.value))} className={fieldClass()} /></label> : null}
                  {section.sectionType === 'hero' ? <div className="space-y-2 text-xs font-bold"><label className="flex items-center gap-2"><input type="checkbox" checked={section.config.showSearch !== false} onChange={(event) => updateConfig(index, 'showSearch', event.target.checked)} /> Arama kutusunu göster</label><label className="flex items-center gap-2"><input type="checkbox" checked={section.config.showTopics !== false} onChange={(event) => updateConfig(index, 'showTopics', event.target.checked)} /> Konu vurgularını göster</label></div> : null}
                  {section.sectionType === 'rich_text' ? <label className="sm:col-span-2"><span className="editor-label">Güvenli HTML içeriği</span><textarea value={typeof section.config.html === 'string' ? section.config.html : ''} onChange={(event) => updateConfig(index, 'html', event.target.value)} rows={8} className={`${fieldClass()} font-mono text-xs`} /></label> : null}
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-4 dark:border-stone-800">
                  <label className="flex items-center gap-2 text-xs font-black"><input type="checkbox" checked={section.isEnabled} onChange={(event) => updateSection(index, { isEnabled: event.target.checked })} /> Bu bloğu yayınla</label>
                  <div className="flex gap-2"><button type="button" onClick={() => setSections((current) => [...current.slice(0, index + 1), { ...section, id: undefined, internalName: `${section.internalName} kopyası`, config: { ...section.config } }, ...current.slice(index + 1)])} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-stone-300 px-3 text-[11px] font-black dark:border-stone-700"><Copy className="h-3.5 w-3.5" /> Çoğalt</button><button type="button" disabled={sections.length <= 1} onClick={() => setSections((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-[11px] font-black text-red-700 disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /> Sil</button></div>
                </div>
              </div>
            </details>
          ))}

          <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-stone-300 bg-white/60 p-4 dark:border-stone-700 dark:bg-stone-900/50 sm:flex-row">
            <select value={newType} onChange={(event) => setNewType(event.target.value as SectionType)} className={`${fieldClass()} flex-1`}>{Object.entries(sectionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <button type="button" onClick={addSection} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 text-xs font-black text-white dark:bg-amber-500 dark:text-stone-950"><Plus className="h-4 w-4" /> Blok ekle</button>
          </div>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
            <h2 className="font-black">Yayın notu</h2>
            <textarea value={changeSummary} onChange={(event) => setChangeSummary(event.target.value)} rows={4} className={`mt-3 ${fieldClass()}`} placeholder="Bu düzende ne değişti?" />
          </section>
          <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center gap-2"><History className="h-4 w-4 text-amber-600" /><h2 className="font-black">Sürüm geçmişi</h2></div>
            <div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
              {revisions.map((revision) => <div key={revision.id} className="rounded-xl border border-stone-200 p-3 dark:border-stone-700"><p className="text-xs font-bold">{revision.change_summary || 'Ana sayfa güncellemesi'}</p><p className="mt-1 text-[10px] text-stone-500">{new Date(revision.created_at).toLocaleString('tr-TR')}</p><button type="button" onClick={() => void restore(revision)} className="mt-2 inline-flex items-center gap-1 text-[10px] font-black text-amber-700 dark:text-amber-400"><RotateCcw className="h-3 w-3" /> Geri yükle</button></div>)}
              {!revisions.length ? <p className="text-xs text-stone-500">İlk yayından sonra sürümler oluşur.</p> : null}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
