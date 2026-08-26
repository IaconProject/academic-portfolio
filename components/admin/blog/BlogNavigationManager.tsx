'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2 } from 'lucide-react';

type Location = 'header' | 'footer' | 'legal';

interface NavigationItem {
  id?: string;
  location: Location;
  label: string;
  href: string;
  openInNewTab: boolean;
  isVisible: boolean;
  sortOrder: number;
}

const locationLabels: Record<Location, string> = {
  header: 'Üst menü',
  footer: 'Alt menü',
  legal: 'Yasal bağlantılar',
};

function fieldClass() {
  return 'w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500 dark:border-stone-700 dark:bg-stone-950';
}

export function BlogNavigationManager() {
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/blog/admin/navigation')
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload?.error?.message || 'Menüler yüklenemedi.');
        }
        if (!cancelled) {
          setItems(
            payload.data.items.map((item: Record<string, unknown>) => ({
              id: item.id as string,
              location: item.location as Location,
              label: (item.label as string) || '',
              href: (item.href as string) || '',
              openInNewTab: Boolean(item.open_in_new_tab),
              isVisible: item.is_visible !== false,
              sortOrder: Number(item.sort_order) || 0,
            }))
          );
        }
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'Menüler yüklenemedi.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function update(index: number, patch: Partial<NavigationItem>) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    );
    setMessage('');
  }

  function move(location: Location, indexWithinGroup: number, direction: -1 | 1) {
    const groupIndexes = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.location === location)
      .map(({ index }) => index);
    const targetWithinGroup = indexWithinGroup + direction;
    if (targetWithinGroup < 0 || targetWithinGroup >= groupIndexes.length) return;
    const sourceIndex = groupIndexes[indexWithinGroup];
    const targetIndex = groupIndexes[targetWithinGroup];
    setItems((current) => {
      const next = [...current];
      [next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/blog/admin/navigation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || 'Menüler kaydedilemedi.');
      }
      setMessage('Menüler yayınlandı ve önbellek yenilendi.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Menüler kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-[55vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-600" /></div>;
  }

  return (
    <main className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div><p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">Gezinme mimarisi</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Menüler</h1><p className="mt-2 text-sm text-stone-600 dark:text-stone-300">Üst menü, alt menü ve yasal bağlantıları düzenleyin.</p></div>
        <button type="button" disabled={saving} onClick={() => void save()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-stone-950 px-5 text-xs font-black text-white disabled:opacity-50 dark:bg-amber-500 dark:text-stone-950">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Menüyü yayınla</button>
      </div>
      {message ? <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{message}</p> : null}
      {error ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</p> : null}

      <div className="mt-7 space-y-6">
        {(Object.keys(locationLabels) as Location[]).map((location) => {
          const group = items
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => item.location === location);
          return (
            <section key={location} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
              <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 dark:border-stone-800"><div><h2 className="font-black">{locationLabels[location]}</h2><p className="mt-1 text-xs text-stone-500">{group.length} bağlantı</p></div><button type="button" onClick={() => setItems((current) => [...current, { location, label: 'Yeni bağlantı', href: '/', openInNewTab: false, isVisible: true, sortOrder: group.length * 10 }])} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-stone-300 px-3 text-[11px] font-black dark:border-stone-700"><Plus className="h-3.5 w-3.5" /> Ekle</button></div>
              {group.length ? <div className="divide-y divide-stone-100 dark:divide-stone-800">{group.map(({ item, index }, groupIndex) => <div key={item.id || `${location}-${index}`} className="grid gap-3 p-4 md:grid-cols-[1fr_1.25fr_8rem_auto] md:items-center"><input value={item.label} onChange={(event) => update(index, { label: event.target.value })} className={fieldClass()} aria-label="Bağlantı etiketi" /><input value={item.href} onChange={(event) => update(index, { href: event.target.value })} className={fieldClass()} aria-label="Bağlantı adresi" /><div className="space-y-1 text-[11px] font-bold"><label className="flex items-center gap-2"><input type="checkbox" checked={item.isVisible} onChange={(event) => update(index, { isVisible: event.target.checked })} /> Görünür</label><label className="flex items-center gap-2"><input type="checkbox" checked={item.openInNewTab} onChange={(event) => update(index, { openInNewTab: event.target.checked })} /> Yeni sekme</label></div><div className="flex gap-1"><button type="button" disabled={groupIndex === 0} onClick={() => move(location, groupIndex, -1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 disabled:opacity-30 dark:border-stone-700" aria-label="Yukarı taşı"><ArrowUp className="h-3.5 w-3.5" /></button><button type="button" disabled={groupIndex === group.length - 1} onClick={() => move(location, groupIndex, 1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 disabled:opacity-30 dark:border-stone-700" aria-label="Aşağı taşı"><ArrowDown className="h-3.5 w-3.5" /></button><button type="button" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700" aria-label="Bağlantıyı sil"><Trash2 className="h-3.5 w-3.5" /></button></div></div>)}</div> : <p className="p-8 text-center text-sm text-stone-500">Bu menüde bağlantı yok.</p>}
            </section>
          );
        })}
      </div>
    </main>
  );
}
