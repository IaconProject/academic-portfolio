'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';

interface SettingsForm {
  siteName: string;
  tagline: string;
  description: string;
  locale: 'tr' | 'en';
  postsPerPage: number;
  authorName: string;
  authorBio: string;
  socialLinks: Array<{ label: string; url: string }>;
  theme: Record<string, unknown>;
  seo: Record<string, unknown>;
  newsletter: Record<string, unknown>;
}

const emptySettings: SettingsForm = {
  siteName: '', tagline: '', description: '', locale: 'tr', postsPerPage: 12,
  authorName: '', authorBio: '', socialLinks: [], theme: {}, seo: {}, newsletter: {},
};

function fieldClass() {
  return 'w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-amber-500 dark:border-stone-700 dark:bg-stone-950';
}

export function BlogSettingsManager() {
  const [form, setForm] = useState<SettingsForm>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/blog/admin/settings')
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Ayarlar yüklenemedi.');
        const settings = payload.data.settings;
        if (!cancelled) setForm({
          siteName: settings.site_name || '', tagline: settings.tagline || '', description: settings.description || '', locale: settings.locale === 'en' ? 'en' : 'tr', postsPerPage: settings.posts_per_page || 12,
          authorName: settings.author_name || '', authorBio: settings.author_bio || '', socialLinks: Array.isArray(settings.social_links) ? settings.social_links : [], theme: settings.theme || {}, seo: settings.seo || {}, newsletter: settings.newsletter || {},
        });
      })
      .catch((caught) => { if (!cancelled) setError(caught instanceof Error ? caught.message : 'Ayarlar yüklenemedi.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function update<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) { setForm((current) => ({ ...current, [key]: value })); setMessage(''); }

  async function save() {
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/blog/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Ayarlar kaydedilemedi.');
      setMessage('Blog ayarları yayınlandı.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Ayarlar kaydedilemedi.'); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="flex min-h-[55vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-600" /></div>;

  return (
    <main className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">Blog yapılandırması</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Genel ayarlar</h1><p className="mt-2 text-sm text-stone-600 dark:text-stone-300">Marka, yazar, SEO, bülten ve görüntüleme tercihleri.</p></div><button type="button" disabled={saving} onClick={() => void save()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-stone-950 px-5 text-xs font-black text-white disabled:opacity-50 dark:bg-amber-500 dark:text-stone-950">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Ayarları kaydet</button></div>
      {message ? <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{message}</p> : null}{error ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</p> : null}
      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"><h2 className="text-lg font-black">Marka ve yayın</h2><div className="mt-4 space-y-4"><label><span className="editor-label">Blog adı</span><input value={form.siteName} onChange={(event) => update('siteName', event.target.value)} className={fieldClass()} /></label><label><span className="editor-label">Slogan</span><input value={form.tagline} onChange={(event) => update('tagline', event.target.value)} className={fieldClass()} /></label><label><span className="editor-label">Site açıklaması</span><textarea value={form.description} onChange={(event) => update('description', event.target.value)} rows={4} className={fieldClass()} /></label><label><span className="editor-label">Sayfa başına yazı</span><input type="number" min={3} max={48} value={form.postsPerPage} onChange={(event) => update('postsPerPage', Number(event.target.value))} className={fieldClass()} /></label></div></section>
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"><h2 className="text-lg font-black">Yazar profili</h2><div className="mt-4 space-y-4"><label><span className="editor-label">Yazar adı</span><input value={form.authorName} onChange={(event) => update('authorName', event.target.value)} className={fieldClass()} /></label><label><span className="editor-label">Kısa biyografi</span><textarea value={form.authorBio} onChange={(event) => update('authorBio', event.target.value)} rows={7} className={fieldClass()} /></label></div></section>
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"><h2 className="text-lg font-black">SEO</h2><div className="mt-4 space-y-4"><label><span className="editor-label">Başlık şablonu</span><input value={typeof form.seo.titleTemplate === 'string' ? form.seo.titleTemplate : '%s | Muhammed Akan Blog'} onChange={(event) => update('seo', { ...form.seo, titleTemplate: event.target.value })} className={fieldClass()} /></label><label className="flex items-center gap-2 text-xs font-black"><input type="checkbox" checked={form.seo.indexing !== false} onChange={(event) => update('seo', { ...form.seo, indexing: event.target.checked })} /> Blog genelinde indekslemeye izin ver</label><p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">Bu ana anahtarı kapatmak tüm blog sayfalarına noindex uygular. Yazı bazlı ayarlar ayrıca korunur.</p></div></section>
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"><h2 className="text-lg font-black">Bülten</h2><div className="mt-4 space-y-3"><label className="flex items-center gap-2 text-xs font-black"><input type="checkbox" checked={form.newsletter.enabled !== false} onChange={(event) => update('newsletter', { ...form.newsletter, enabled: event.target.checked })} /> Kayıt formlarını göster</label><label className="flex items-center gap-2 text-xs font-black"><input type="checkbox" checked={form.newsletter.doubleOptIn !== false} onChange={(event) => update('newsletter', { ...form.newsletter, doubleOptIn: event.target.checked })} /> Çift onay zorunlu</label><label><span className="editor-label">Rıza sürümü</span><input value={typeof form.newsletter.consentVersion === 'string' ? form.newsletter.consentVersion : ''} onChange={(event) => update('newsletter', { ...form.newsletter, consentVersion: event.target.value })} className={fieldClass()} /></label></div></section>
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 lg:col-span-2"><div className="flex items-center justify-between"><div><h2 className="text-lg font-black">Sosyal bağlantılar</h2><p className="mt-1 text-xs text-stone-500">Yazar ve yayıncı yapılandırılmış verilerinde kullanılabilir.</p></div><button type="button" onClick={() => update('socialLinks', [...form.socialLinks, { label: '', url: 'https://' }])} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-stone-300 px-3 text-[11px] font-black dark:border-stone-700"><Plus className="h-3.5 w-3.5" /> Ekle</button></div><div className="mt-4 space-y-3">{form.socialLinks.map((link, index) => <div key={`${index}-${link.label}`} className="grid gap-2 sm:grid-cols-[12rem_1fr_auto]"><input value={link.label} onChange={(event) => update('socialLinks', form.socialLinks.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} className={fieldClass()} placeholder="GitHub" /><input type="url" value={link.url} onChange={(event) => update('socialLinks', form.socialLinks.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item))} className={fieldClass()} placeholder="https://" /><button type="button" onClick={() => update('socialLinks', form.socialLinks.filter((_, itemIndex) => itemIndex !== index))} className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700" aria-label="Bağlantıyı sil"><Trash2 className="h-4 w-4" /></button></div>)}</div></section>
      </div>
    </main>
  );
}
